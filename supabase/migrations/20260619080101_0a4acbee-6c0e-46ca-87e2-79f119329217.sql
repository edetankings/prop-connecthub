
-- Helper: ensure wallet row
CREATE OR REPLACE FUNCTION public.ensure_wallet(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets(user_id, balance, escrow_balance)
  VALUES(_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END; $$;

-- Add unique constraint if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='wallets_user_id_key') THEN
    ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add dispute columns
ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Audit log helper
CREATE OR REPLACE FUNCTION public.log_admin_action(_action text, _details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs(user_id, action, details)
  VALUES (auth.uid(), _action, COALESCE(_details, '{}'::jsonb));
END; $$;

-- Approve secure payment
CREATE OR REPLACE FUNCTION public.approve_secure_payment(_transaction_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF tx.payment_status <> 'under_review' THEN RAISE EXCEPTION 'not awaiting review'; END IF;

  UPDATE public.transactions SET payment_status='secured', status='secured', updated_at=now() WHERE id=_transaction_id;
  UPDATE public.properties SET status='transaction_in_progress' WHERE id=tx.property_id;

  PERFORM public.ensure_wallet(tx.seller_id);
  UPDATE public.wallets SET escrow_balance = escrow_balance + (tx.total_payable - COALESCE(tx.commission_amount,0)), updated_at=now() WHERE user_id=tx.seller_id;

  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
    (tx.buyer_id,'Payment Secured ✅','Your payment is held safely in escrow. Once you confirm delivery, funds will be released to the agent.','success','/dashboard/buyer'),
    (tx.seller_id,'Payment Secured for your listing','A buyer''s payment has been verified and is now held in escrow. Proceed with handover.','success','/dashboard/agent');

  PERFORM public.log_admin_action('approve_secure_payment', jsonb_build_object('transaction_id',_transaction_id,'property_id',tx.property_id));
END; $$;

-- Reject secure payment
CREATE OR REPLACE FUNCTION public.reject_secure_payment(_transaction_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF tx.payment_status NOT IN ('under_review','pending_payment') THEN RAISE EXCEPTION 'cannot reject'; END IF;

  UPDATE public.transactions SET payment_status='rejected', status='rejected', rejection_reason=_reason, updated_at=now() WHERE id=_transaction_id;
  UPDATE public.properties SET status='available' WHERE id=tx.property_id AND status='payment_pending';

  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
    (tx.buyer_id,'Payment Rejected','Your payment proof was rejected. Reason: ' || COALESCE(_reason,'Not specified') || '. Please contact support or try again.','error','/dashboard/buyer');

  PERFORM public.log_admin_action('reject_secure_payment', jsonb_build_object('transaction_id',_transaction_id,'reason',_reason));
END; $$;

-- Release funds
CREATE OR REPLACE FUNCTION public.release_secure_payment(_transaction_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD; net_amount bigint; is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  is_admin := public.has_role(auth.uid(),'admin');
  IF NOT is_admin AND auth.uid() <> tx.buyer_id THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF tx.payment_status <> 'secured' THEN RAISE EXCEPTION 'transaction not secured'; END IF;

  net_amount := tx.total_payable - COALESCE(tx.commission_amount,0);

  UPDATE public.transactions SET payment_status='released', status='released', released_at=now(), updated_at=now() WHERE id=_transaction_id;

  PERFORM public.ensure_wallet(tx.seller_id);
  UPDATE public.wallets SET escrow_balance = GREATEST(escrow_balance - net_amount, 0), balance = balance + net_amount, updated_at=now() WHERE user_id=tx.seller_id;

  INSERT INTO public.company_wallet(balance,total_earned) SELECT 0,0 WHERE NOT EXISTS(SELECT 1 FROM public.company_wallet);
  UPDATE public.company_wallet SET balance = balance + COALESCE(tx.commission_amount,0), total_earned = total_earned + COALESCE(tx.commission_amount,0), updated_at=now();

  INSERT INTO public.earnings(user_id,amount,type,source,level,from_user_id,transaction_id,description)
  VALUES (tx.seller_id, net_amount, 'sale_payout','transaction',0,tx.buyer_id,_transaction_id,'Net payout from secured transaction');

  UPDATE public.properties SET status = CASE WHEN tx.type='rental' THEN 'rented'::property_status ELSE 'sold'::property_status END WHERE id=tx.property_id;

  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
    (tx.seller_id,'Funds Released 💰','₦' || net_amount::text || ' has been credited to your wallet.','success','/dashboard/agent'),
    (tx.buyer_id,'Transaction Completed ✅','Funds have been released to the agent. Thank you for using Prop-Connect.','success','/dashboard/buyer');

  IF is_admin THEN
    PERFORM public.log_admin_action('release_secure_payment', jsonb_build_object('transaction_id',_transaction_id));
  END IF;
END; $$;

-- Refund
CREATE OR REPLACE FUNCTION public.refund_secure_payment(_transaction_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD; net_amount bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
  IF tx IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF tx.payment_status NOT IN ('secured','released','under_review') THEN RAISE EXCEPTION 'cannot refund'; END IF;

  net_amount := tx.total_payable - COALESCE(tx.commission_amount,0);

  IF tx.payment_status = 'secured' THEN
    PERFORM public.ensure_wallet(tx.seller_id);
    UPDATE public.wallets SET escrow_balance = GREATEST(escrow_balance - net_amount, 0), updated_at=now() WHERE user_id=tx.seller_id;
  ELSIF tx.payment_status = 'released' THEN
    PERFORM public.ensure_wallet(tx.seller_id);
    UPDATE public.wallets SET balance = GREATEST(balance - net_amount, 0), updated_at=now() WHERE user_id=tx.seller_id;
    UPDATE public.company_wallet SET balance = GREATEST(balance - COALESCE(tx.commission_amount,0), 0), updated_at=now();
  END IF;

  UPDATE public.transactions SET payment_status='refunded', status='refunded', rejection_reason=_reason, updated_at=now() WHERE id=_transaction_id;
  UPDATE public.properties SET status='available' WHERE id=tx.property_id AND status IN ('payment_pending','transaction_in_progress');

  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
    (tx.buyer_id,'Refund Issued','Your transaction has been refunded. Reason: ' || COALESCE(_reason,'') ,'info','/dashboard/buyer'),
    (tx.seller_id,'Transaction Refunded','A transaction on your listing was refunded by admin. Reason: ' || COALESCE(_reason,''),'warning','/dashboard/agent');

  PERFORM public.log_admin_action('refund_secure_payment', jsonb_build_object('transaction_id',_transaction_id,'reason',_reason));
END; $$;

-- Expire stale
CREATE OR REPLACE FUNCTION public.expire_stale_transactions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n integer := 0;
BEGIN
  FOR r IN SELECT * FROM public.transactions WHERE payment_status='pending_payment' AND expires_at < now() LOOP
    UPDATE public.transactions SET payment_status='expired', status='expired', updated_at=now() WHERE id=r.id;
    UPDATE public.properties SET status='available' WHERE id=r.property_id AND status='payment_pending';
    INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
      (r.buyer_id,'Payment Window Expired','Your 72-hour secure payment window expired. The property is available again.','warning','/dashboard/buyer');
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

-- Raise dispute
CREATE OR REPLACE FUNCTION public.raise_dispute(_transaction_id uuid, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tx RECORD; d_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id=_transaction_id;
  IF tx IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF auth.uid() NOT IN (tx.buyer_id, tx.seller_id) THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.disputes(reporter_id, reported_id, property_id, reason, status, transaction_id)
  VALUES (auth.uid(), CASE WHEN auth.uid()=tx.buyer_id THEN tx.seller_id ELSE tx.buyer_id END, tx.property_id, _reason, 'open', _transaction_id)
  RETURNING id INTO d_id;

  INSERT INTO public.notifications(user_id,title,message,type,link)
  SELECT ur.user_id,'New Dispute Raised','A user has opened a dispute on transaction ' || COALESCE(tx.property_code,'') ,'warning','/admin/disputes'
  FROM public.user_roles ur WHERE ur.role='admin';

  RETURN d_id;
END; $$;

-- Resolve dispute
CREATE OR REPLACE FUNCTION public.resolve_dispute(_dispute_id uuid, _status text, _resolution text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('open','under_review','resolved','refunded','rejected') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT * INTO d FROM public.disputes WHERE id=_dispute_id;
  IF d IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.disputes SET status=_status, resolution=_resolution, resolved_by=auth.uid(), resolved_at=now(), updated_at=now() WHERE id=_dispute_id;
  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
    (d.reporter_id,'Dispute Update','Your dispute is now: ' || _status,'info','/dashboard/buyer'),
    (d.reported_id,'Dispute Update','A dispute concerning you is now: ' || _status,'info','/dashboard/agent');
  PERFORM public.log_admin_action('resolve_dispute', jsonb_build_object('dispute_id',_dispute_id,'status',_status));
END; $$;

-- Withdrawal moderation
CREATE OR REPLACE FUNCTION public.approve_withdrawal(_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=_id FOR UPDATE;
  IF w IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid state'; END IF;
  PERFORM public.ensure_wallet(w.user_id);
  UPDATE public.wallets SET balance = GREATEST(balance - w.amount, 0), updated_at=now() WHERE user_id=w.user_id;
  UPDATE public.withdrawals SET status='paid', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_id;
  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
    (w.user_id,'Withdrawal Paid ✅','Your withdrawal of ₦' || w.amount::text || ' has been processed.','success','/earnings');
  PERFORM public.log_admin_action('approve_withdrawal', jsonb_build_object('withdrawal_id',_id));
END; $$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=_id FOR UPDATE;
  IF w IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.withdrawals SET status='rejected', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now() WHERE id=_id;
  INSERT INTO public.notifications(user_id,title,message,type,link) VALUES
    (w.user_id,'Withdrawal Rejected','Your withdrawal request was rejected. Note: ' || COALESCE(_note,''),'warning','/earnings');
  PERFORM public.log_admin_action('reject_withdrawal', jsonb_build_object('withdrawal_id',_id,'note',_note));
END; $$;
