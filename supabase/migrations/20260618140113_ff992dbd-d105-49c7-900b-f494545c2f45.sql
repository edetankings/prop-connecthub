
-- payment_status enum
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM (
    'pending_payment','under_review','secured','released','expired','refunded','rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS property_code TEXT,
  ADD COLUMN IF NOT EXISTS commission_amount BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_payable BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property ON public.transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON public.transactions(payment_status);

-- Replace transactions RLS
DROP POLICY IF EXISTS "Users see own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Buyers see their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Agents see their property transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins see all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Buyers create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Buyers update their own transaction proof" ON public.transactions;

CREATE POLICY "Buyers see their own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Agents see their property transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Admins see all transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update transactions"
  ON public.transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- commission_settings
CREATE TABLE IF NOT EXISTS public.commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_percent NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  rental_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  reservation_flat BIGINT NOT NULL DEFAULT 5000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.commission_settings TO anon, authenticated;
GRANT ALL ON public.commission_settings TO service_role;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read commission settings" ON public.commission_settings;
CREATE POLICY "Anyone can read commission settings"
  ON public.commission_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage commission settings" ON public.commission_settings;
CREATE POLICY "Admins manage commission settings"
  ON public.commission_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.commission_settings (sales_percent, rental_percent, reservation_flat)
SELECT 1.00, 5.00, 5000
WHERE NOT EXISTS (SELECT 1 FROM public.commission_settings);

-- platform_settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_account_name TEXT NOT NULL DEFAULT 'PROP-CONNECT LTD',
  company_account_number TEXT NOT NULL DEFAULT '0000000000',
  company_bank_name TEXT NOT NULL DEFAULT 'Update in Admin Settings',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.platform_settings (company_account_name, company_account_number, company_bank_name)
SELECT 'PROP-CONNECT LTD', '0000000000', 'Update in Admin Settings'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- Initiate transaction RPC
CREATE OR REPLACE FUNCTION public.initiate_secure_payment(_property_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop RECORD;
  agent_profile RECORD;
  cs RECORD;
  commission BIGINT;
  tx_id UUID;
  buyer_uid UUID := auth.uid();
BEGIN
  IF buyer_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO prop FROM public.properties WHERE id = _property_id FOR UPDATE;
  IF prop IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF prop.status IN ('payment_pending','transaction_in_progress','sold','rented') THEN
    RAISE EXCEPTION 'Property is no longer available for purchase';
  END IF;

  SELECT * INTO agent_profile FROM public.profiles WHERE id = prop.agent_id;
  IF agent_profile IS NULL THEN RAISE EXCEPTION 'Agent profile missing'; END IF;
  IF agent_profile.user_id = buyer_uid THEN
    RAISE EXCEPTION 'You cannot purchase your own property';
  END IF;

  SELECT * INTO cs FROM public.commission_settings ORDER BY updated_at DESC LIMIT 1;

  IF prop.status = 'for_rent' THEN
    commission := ROUND(prop.price * COALESCE(cs.rental_percent, 5) / 100.0);
  ELSE
    commission := ROUND(prop.price * COALESCE(cs.sales_percent, 1) / 100.0);
  END IF;

  INSERT INTO public.transactions (
    buyer_id, seller_id, property_id, property_code,
    amount, commission, commission_amount, total_payable,
    payment_status, type, status, expires_at
  ) VALUES (
    buyer_uid, agent_profile.user_id, prop.id, prop.property_code,
    prop.price, commission, commission, prop.price,
    'pending_payment',
    CASE WHEN prop.status = 'for_rent' THEN 'rental' ELSE 'sale' END,
    'pending_payment',
    now() + interval '72 hours'
  )
  RETURNING id INTO tx_id;

  UPDATE public.properties SET status = 'payment_pending' WHERE id = prop.id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    agent_profile.user_id,
    'Buyer initiated secure payment',
    'A buyer has begun the secure payment for "' || prop.title || '" (' || COALESCE(prop.property_code, 'PROP') || ').',
    'info',
    '/agent-dashboard'
  );

  RETURN tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.initiate_secure_payment(UUID) FROM public;
REVOKE ALL ON FUNCTION public.initiate_secure_payment(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.initiate_secure_payment(UUID) TO authenticated;

-- Submit payment proof RPC
CREATE OR REPLACE FUNCTION public.submit_payment_proof(_transaction_id UUID, _proof_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO tx FROM public.transactions WHERE id = _transaction_id;
  IF tx IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF tx.buyer_id <> auth.uid() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF tx.payment_status NOT IN ('pending_payment','under_review') THEN
    RAISE EXCEPTION 'Transaction is no longer awaiting payment proof';
  END IF;

  UPDATE public.transactions
    SET proof_url = _proof_url,
        proof_uploaded_at = now(),
        payment_status = 'under_review',
        status = 'under_review',
        updated_at = now()
    WHERE id = _transaction_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, 'Payment proof submitted',
         'A buyer uploaded payment proof for a secure transaction. Review required.',
         'info', '/admin/secure-payments'
  FROM public.user_roles ur WHERE ur.role = 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_proof(UUID, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.submit_payment_proof(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(UUID, TEXT) TO authenticated;
