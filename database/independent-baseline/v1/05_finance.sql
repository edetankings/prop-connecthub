-- No RPC transfers bank funds. Administrators attest completed external payment steps.
CREATE FUNCTION public.ensure_wallet(_user_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
 INSERT INTO public.wallets(user_id) VALUES(_user_id) ON CONFLICT(user_id) DO NOTHING;
$$;

CREATE FUNCTION prop_connect_private.credit_earning(_key text,_user uuid,_amount bigint,
 _type text,_source text,_level integer,_from uuid,_tx uuid,_sub uuid,_description text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 INSERT INTO public.earnings(event_key,user_id,amount,type,source,level,from_user_id,transaction_id,subscription_id,description)
 VALUES(_key,_user,_amount,_type,_source,_level,_from,_tx,_sub,_description)
 ON CONFLICT(event_key) DO NOTHING;
 IF FOUND AND _amount>0 THEN
   PERFORM public.ensure_wallet(_user);
   UPDATE public.wallets SET balance=balance+_amount WHERE user_id=_user;
 END IF;
END $$;

CREATE FUNCTION public.approve_secure_payment(_transaction_id uuid,_payment_reference text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE tx public.transactions;
BEGIN
 PERFORM prop_connect_private.assert_admin(); PERFORM prop_connect_private.assert_finance_ready();
 SELECT * INTO STRICT tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
 IF nullif(btrim(_payment_reference),'') IS NULL THEN RAISE EXCEPTION 'Verified external payment reference required'; END IF;
 IF tx.payment_status<>'under_review' OR tx.proof_url IS NULL THEN RAISE EXCEPTION 'Payment evidence awaiting review required'; END IF;
 INSERT INTO prop_connect_private.payment_receipts(reference,purpose,record_id)
 VALUES(btrim(_payment_reference),'listing_payment',tx.id);
 PERFORM public.ensure_wallet(tx.seller_id);
 UPDATE public.wallets SET escrow_balance=escrow_balance+tx.total_payable-tx.commission_amount WHERE user_id=tx.seller_id;
 UPDATE public.transactions SET payment_status='secured',status='secured',receipt_reference=_payment_reference WHERE id=tx.id;
 UPDATE public.properties SET status='transaction_in_progress' WHERE id=tx.property_id;
 PERFORM public.log_admin_action('approve_secure_payment',jsonb_build_object('transaction_id',tx.id));
END $$;

CREATE FUNCTION public.submit_payment_proof(_transaction_id uuid,_proof_url text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE tx public.transactions;
BEGIN
 PERFORM prop_connect_private.assert_finance_ready();
 SELECT * INTO STRICT tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
 IF auth.uid() IS NULL OR tx.buyer_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Buyer authorization required'; END IF;
 IF tx.payment_status NOT IN ('pending_payment','under_review') OR tx.expires_at<=now() THEN RAISE EXCEPTION 'Payment window closed'; END IF;
 IF split_part(_proof_url,'/',1) IS DISTINCT FROM auth.uid()::text THEN RAISE EXCEPTION 'Store an owned payment-screenshots object path, not a public URL'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='payment-screenshots' AND name=_proof_url) THEN RAISE EXCEPTION 'Payment evidence missing'; END IF;
 UPDATE public.transactions SET proof_url=_proof_url,proof_uploaded_at=now(),payment_status='under_review',status='under_review' WHERE id=tx.id;
 INSERT INTO public.notifications(user_id,title,message,type,link)
 SELECT user_id,'Payment review','Payment evidence requires review.','info','/admin/secure-payments' FROM public.user_roles WHERE role='admin';
END $$;

CREATE FUNCTION public.reject_secure_payment(_transaction_id uuid,_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE tx public.transactions;
BEGIN
 PERFORM prop_connect_private.assert_admin();
 IF nullif(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'Reason required'; END IF;
 SELECT * INTO STRICT tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
 IF tx.payment_status NOT IN ('pending_payment','under_review') THEN RAISE EXCEPTION 'Invalid payment state'; END IF;
 UPDATE public.transactions SET payment_status='rejected',status='rejected',rejection_reason=_reason WHERE id=tx.id;
 UPDATE public.properties SET status='available' WHERE id=tx.property_id AND status='payment_pending';
 PERFORM public.log_admin_action('reject_secure_payment',jsonb_build_object('transaction_id',tx.id,'reason',_reason));
END $$;

CREATE FUNCTION public.release_secure_payment(_transaction_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE tx public.transactions; net bigint;
BEGIN
 PERFORM prop_connect_private.assert_finance_ready();
 SELECT * INTO STRICT tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
 IF auth.uid() IS NULL OR (tx.buyer_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Buyer or administrator required'; END IF;
 IF tx.payment_status<>'secured' THEN RAISE EXCEPTION 'Only secured payments may be released'; END IF;
 IF EXISTS(SELECT 1 FROM public.disputes WHERE transaction_id=tx.id AND status IN ('open','under_review')) THEN RAISE EXCEPTION 'Open dispute blocks release'; END IF;
 net:=tx.total_payable-tx.commission_amount;
 PERFORM 1 FROM public.company_wallet FOR UPDATE;
 UPDATE public.wallets SET escrow_balance=escrow_balance-net WHERE user_id=tx.seller_id AND escrow_balance>=net;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow reconciliation required'; END IF;
 PERFORM prop_connect_private.credit_earning('transaction:'||tx.id||':payout',tx.seller_id,net,'sale_payout','transaction',0,tx.buyer_id,tx.id,NULL,'Secured listing payout');
 UPDATE public.company_wallet SET balance=balance+tx.commission_amount,total_earned=total_earned+tx.commission_amount;
 UPDATE public.transactions SET payment_status='released',status='released',released_at=now() WHERE id=tx.id;
 UPDATE public.properties SET status=CASE WHEN tx.type='rental' THEN 'rented'::public.property_status ELSE 'sold'::public.property_status END WHERE id=tx.property_id;
 INSERT INTO public.audit_logs(user_id,action,details) VALUES(auth.uid(),'release_secure_payment',jsonb_build_object('transaction_id',tx.id));
END $$;

CREATE FUNCTION public.refund_secure_payment(_transaction_id uuid,_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE tx public.transactions; net bigint;
BEGIN
 PERFORM prop_connect_private.assert_admin(); PERFORM prop_connect_private.assert_finance_ready();
 IF nullif(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'Refund evidence/reference required'; END IF;
 SELECT * INTO STRICT tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
 IF tx.payment_status<>'secured' THEN RAISE EXCEPTION 'Only pre-release refunds implemented; post-release recovery requires an approved policy'; END IF;
 net:=tx.total_payable-tx.commission_amount;
 UPDATE public.wallets SET escrow_balance=escrow_balance-net WHERE user_id=tx.seller_id AND escrow_balance>=net;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow reconciliation required'; END IF;
 UPDATE public.transactions SET payment_status='refunded',status='refunded',rejection_reason=_reason WHERE id=tx.id;
 UPDATE public.properties SET status='available' WHERE id=tx.property_id AND status='transaction_in_progress';
 PERFORM public.log_admin_action('refund_secure_payment',jsonb_build_object('transaction_id',tx.id,'reference',_reason));
END $$;

CREATE FUNCTION public.expire_stale_transactions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE tx record; count_expired integer:=0;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN PERFORM prop_connect_private.assert_admin(); END IF;
 FOR tx IN SELECT * FROM public.transactions WHERE payment_status='pending_payment' AND expires_at<now() FOR UPDATE SKIP LOCKED LOOP
   UPDATE public.transactions SET payment_status='expired',status='expired' WHERE id=tx.id;
   UPDATE public.properties SET status='available' WHERE id=tx.property_id AND status='payment_pending';
   count_expired:=count_expired+1;
 END LOOP;
 RETURN count_expired;
END $$;

CREATE FUNCTION public.raise_dispute(_transaction_id uuid,_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE tx public.transactions; reporter uuid; reported uuid; result uuid;
BEGIN
 SELECT * INTO STRICT tx FROM public.transactions WHERE id=_transaction_id FOR UPDATE;
 IF auth.uid() IS NULL OR auth.uid() NOT IN (tx.buyer_id,tx.seller_id) THEN RAISE EXCEPTION 'Transaction party required'; END IF;
 IF nullif(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'Reason required'; END IF;
 SELECT id INTO STRICT reporter FROM public.profiles WHERE user_id=auth.uid();
 SELECT id INTO STRICT reported FROM public.profiles WHERE user_id=CASE WHEN auth.uid()=tx.buyer_id THEN tx.seller_id ELSE tx.buyer_id END;
 INSERT INTO public.disputes(reporter_id,reported_id,property_id,transaction_id,reason,status)
 VALUES(reporter,reported,tx.property_id,tx.id,_reason,'open') RETURNING id INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.resolve_dispute(_dispute_id uuid,_status text,_resolution text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 PERFORM prop_connect_private.assert_admin();
 IF _status IS NULL OR _status NOT IN ('under_review','resolved','rejected') OR nullif(btrim(_resolution),'') IS NULL THEN
   RAISE EXCEPTION 'Explicit non-financial resolution required; use refund RPC separately'; END IF;
 UPDATE public.disputes SET status=_status,resolution=_resolution,resolved_by=auth.uid(),resolved_at=now() WHERE id=_dispute_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
 PERFORM public.log_admin_action('resolve_dispute',jsonb_build_object('dispute_id',_dispute_id,'status',_status));
END $$;

CREATE FUNCTION public.request_withdrawal(_amount bigint,_bank_name text,_account_number text,_account_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result uuid;
BEGIN
 PERFORM prop_connect_private.assert_finance_ready();
 IF auth.uid() IS NULL OR _amount IS NULL OR _amount<5000 OR nullif(btrim(_bank_name),'') IS NULL
   OR nullif(btrim(_account_number),'') IS NULL OR nullif(btrim(_account_name),'') IS NULL THEN RAISE EXCEPTION 'Invalid withdrawal'; END IF;
 UPDATE public.wallets SET balance=balance-_amount,withdrawal_reserved=withdrawal_reserved+_amount WHERE user_id=auth.uid() AND balance>=_amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;
 INSERT INTO public.withdrawals(user_id,amount,bank_name,account_number,account_name)
 VALUES(auth.uid(),_amount,_bank_name,_account_number,_account_name) RETURNING id INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.approve_withdrawal(_id uuid,_note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE w public.withdrawals;
BEGIN
 PERFORM prop_connect_private.assert_admin(); PERFORM prop_connect_private.assert_finance_ready();
 IF nullif(btrim(_note),'') IS NULL THEN RAISE EXCEPTION 'External payout reference required'; END IF;
 SELECT * INTO STRICT w FROM public.withdrawals WHERE id=_id FOR UPDATE;
 IF w.status<>'pending' THEN RAISE EXCEPTION 'Withdrawal already processed'; END IF;
 INSERT INTO prop_connect_private.payment_receipts(reference,purpose,record_id)
 VALUES(btrim(_note),'withdrawal',w.id);
 UPDATE public.wallets SET withdrawal_reserved=withdrawal_reserved-w.amount WHERE user_id=w.user_id AND withdrawal_reserved>=w.amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reserved funds reconciliation required'; END IF;
 UPDATE public.withdrawals SET status='paid',admin_note=_note,payment_reference=_note,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_id;
 PERFORM public.log_admin_action('approve_withdrawal',jsonb_build_object('withdrawal_id',_id,'reference',_note));
END $$;

CREATE FUNCTION public.reject_withdrawal(_id uuid,_note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE w public.withdrawals;
BEGIN
 PERFORM prop_connect_private.assert_admin();
 SELECT * INTO STRICT w FROM public.withdrawals WHERE id=_id FOR UPDATE;
 IF w.status<>'pending' THEN RAISE EXCEPTION 'Withdrawal already processed'; END IF;
 UPDATE public.wallets SET withdrawal_reserved=withdrawal_reserved-w.amount,balance=balance+w.amount WHERE user_id=w.user_id AND withdrawal_reserved>=w.amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reserved funds reconciliation required'; END IF;
 UPDATE public.withdrawals SET status='rejected',admin_note=_note,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=_id;
 PERFORM public.log_admin_action('reject_withdrawal',jsonb_build_object('withdrawal_id',_id));
END $$;

-- Reviewed historical candidate: 2500 company + 1000 direct + 4000 matrix = 7500 NGN major units.
CREATE FUNCTION public.distribute_subscription_payment(_subscription_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.subscriptions; cfg public.platform_settings; subscriber public.profiles;
 parent public.profiles; parent_id uuid; lvl integer; share bigint; kind text; key text;
 weights integer[]:=ARRAY[1000,600,400,300,300,200,200,200,200,200,80,80,80,80,80];
BEGIN
 PERFORM prop_connect_private.assert_finance_ready();
 SELECT * INTO STRICT cfg FROM public.platform_settings;
 IF NOT cfg.referral_rules_approved OR cfg.referral_policy IS DISTINCT FROM 'legacy-15-level-v1'
   OR cfg.monetary_unit IS DISTINCT FROM 'NGN_MAJOR' OR cfg.subscription_amount IS DISTINCT FROM 7500 THEN
   RAISE EXCEPTION 'Owner must approve legacy referral allocation, beneficiary semantics, and major currency units'; END IF;
 SELECT * INTO STRICT s FROM public.subscriptions WHERE id=_subscription_id FOR UPDATE;
 IF s.status<>'active' OR s.paid_amount IS DISTINCT FROM 7500 OR s.activation_request_id IS NULL THEN RAISE EXCEPTION 'Verified paid subscription required'; END IF;
 IF s.distribution_version=s.activation_version THEN RETURN; END IF;
 IF s.distribution_version<>s.activation_version-1 THEN RAISE EXCEPTION 'Activation sequence invalid'; END IF;
 SELECT * INTO STRICT subscriber FROM public.profiles WHERE user_id=s.user_id;
 key:='subscription:'||s.id||':'||s.activation_version;
 INSERT INTO public.earnings(event_key,user_id,amount,type,source,level,from_user_id,subscription_id,description)
 VALUES(key||':company',s.user_id,0,'company_fee','subscription',0,s.user_id,s.id,'Distribution marker; company share 2500');
 UPDATE public.company_wallet SET balance=balance+2500,total_earned=total_earned+2500;
 FOR lvl IN 0..15 LOOP
   IF lvl=0 THEN parent_id:=subscriber.referred_by; share:=1000; kind:='direct_referral';
   ELSE
     IF lvl=1 THEN parent_id:=subscriber.referred_by; END IF;
     share:=weights[lvl]; kind:='matrix';
   END IF;
   key:='subscription:'||s.id||':'||s.activation_version||':'||kind||':'||lvl;
   IF parent_id IS NULL THEN
     UPDATE public.company_wallet SET balance=balance+share,total_earned=total_earned+share;
   ELSE
     SELECT * INTO STRICT parent FROM public.profiles WHERE id=parent_id;
     IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=parent.user_id AND status='active' AND end_date>now()) THEN
       PERFORM prop_connect_private.credit_earning(key,parent.user_id,share,kind,'subscription',lvl,s.user_id,NULL,s.id,'Approved referral allocation');
     ELSE
       INSERT INTO public.escrow_holds(event_key,intended_user_id,from_user_id,subscription_id,level,amount)
       VALUES(key,parent.user_id,s.user_id,s.id,lvl,share);
     END IF;
     IF lvl>0 THEN parent_id:=parent.referred_by; END IF;
   END IF;
 END LOOP;
 UPDATE public.subscriptions SET distribution_version=activation_version WHERE id=s.id;
END $$;

CREATE FUNCTION public.activate_subscription(_request_id uuid,_end_date timestamptz,_payment_reference text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE request public.subscription_requests; s uuid; cfg public.platform_settings;
BEGIN
 PERFORM prop_connect_private.assert_admin(); PERFORM prop_connect_private.assert_finance_ready();
 SELECT * INTO STRICT request FROM public.subscription_requests WHERE id=_request_id FOR UPDATE;
 IF nullif(btrim(_payment_reference),'') IS NULL THEN RAISE EXCEPTION 'Verified external payment reference required'; END IF;
 IF request.status<>'pending' OR _end_date IS NULL OR _end_date<=now() THEN RAISE EXCEPTION 'Pending evidence and explicit future expiry required'; END IF;
 INSERT INTO prop_connect_private.payment_receipts(reference,purpose,record_id)
 VALUES(btrim(_payment_reference),'subscription',request.id);
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='payment-screenshots' AND name=request.screenshot_url
   AND split_part(name,'/',1)=request.user_id::text) THEN RAISE EXCEPTION 'Owned subscription evidence required'; END IF;
 IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=request.user_id AND status='active' AND end_date>now()) THEN RAISE EXCEPTION 'Active-term renewal policy unresolved'; END IF;
 SELECT * INTO STRICT cfg FROM public.platform_settings;
 INSERT INTO public.subscriptions(user_id,status,start_date,end_date,activation_version,activation_request_id,paid_amount)
 VALUES(request.user_id,'active',now(),_end_date,1,request.id,cfg.subscription_amount)
 ON CONFLICT(user_id) DO UPDATE SET status='active',start_date=now(),end_date=_end_date,
   activation_version=public.subscriptions.activation_version+1,activation_request_id=request.id,paid_amount=cfg.subscription_amount
 RETURNING id INTO s;
 PERFORM public.distribute_subscription_payment(s);
 UPDATE public.subscription_requests SET status='approved',reviewed_by=auth.uid(),reviewed_at=now(),payment_reference=_payment_reference WHERE id=request.id;
 PERFORM public.log_admin_action('activate_subscription',jsonb_build_object('request_id',request.id,'subscription_id',s));
 RETURN s;
END $$;

CREATE FUNCTION public.pay_verification_referral_bonus(_referred_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.platform_settings WHERE verification_bonus_policy IS NOT NULL) THEN
   RAISE EXCEPTION 'Verification bonus funding, eligibility and reversal policy unresolved; no bonus paid'; END IF;
 -- Deliberately disabled, not silently minted from an unspecified funding source.
END $$;

CREATE FUNCTION public.reject_subscription_request(_request_id uuid,_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 PERFORM prop_connect_private.assert_admin();
 IF nullif(btrim(_reason),'') IS NULL THEN RAISE EXCEPTION 'Review reason required'; END IF;
 UPDATE public.subscription_requests SET status='rejected',review_note=_reason,reviewed_by=auth.uid(),reviewed_at=now()
 WHERE id=_request_id AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Pending subscription request required'; END IF;
 PERFORM public.log_admin_action('reject_subscription_request',jsonb_build_object('request_id',_request_id));
END $$;
CREATE FUNCTION public.on_kyc_verified_pay_referral() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN IF NEW.kyc_verified AND NOT OLD.kyc_verified THEN PERFORM public.pay_verification_referral_bonus(NEW.user_id); END IF; RETURN NEW; END $$;
CREATE FUNCTION public.on_subscription_active_pay_referral() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN PERFORM public.pay_verification_referral_bonus(NEW.user_id); RETURN NEW; END $$;
CREATE FUNCTION public.on_subscription_activated() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NEW.status='active' AND (TG_OP='INSERT' OR NEW.activation_version IS DISTINCT FROM OLD.activation_version) THEN
   PERFORM public.distribute_subscription_payment(NEW.id);
 END IF;
 RETURN NEW;
END $$;
