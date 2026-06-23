
-- Backfill property codes for any properties missing one
UPDATE public.properties p
SET property_code = public.generate_property_code(p.agent_id, p.state)
WHERE p.property_code IS NULL OR p.property_code = '';

-- Deal requests table
CREATE TABLE IF NOT EXISTS public.deal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,
  agent_user_id UUID NOT NULL,
  agent_profile_id UUID NOT NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  property_code TEXT,
  buyer_message TEXT,
  decline_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id UUID,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_requests_buyer_idx ON public.deal_requests(buyer_id);
CREATE INDEX IF NOT EXISTS deal_requests_agent_idx ON public.deal_requests(agent_user_id);
CREATE INDEX IF NOT EXISTS deal_requests_property_idx ON public.deal_requests(property_id);
CREATE INDEX IF NOT EXISTS deal_requests_status_idx ON public.deal_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.deal_requests TO authenticated;
GRANT ALL ON public.deal_requests TO service_role;

ALTER TABLE public.deal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer can read own deal requests"
  ON public.deal_requests FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

CREATE POLICY "Agent can read deal requests on their listings"
  ON public.deal_requests FOR SELECT TO authenticated
  USING (agent_user_id = auth.uid());

CREATE POLICY "Admins can read all deal requests"
  ON public.deal_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- All writes go through SECURITY DEFINER RPCs; no direct insert/update policies.

CREATE TRIGGER update_deal_requests_updated_at
  BEFORE UPDATE ON public.deal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RPC: buyer requests a deal
CREATE OR REPLACE FUNCTION public.request_deal(_property_id UUID, _message TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop RECORD;
  agent_profile RECORD;
  existing UUID;
  new_id UUID;
  buyer_uid UUID := auth.uid();
BEGIN
  IF buyer_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO prop FROM public.properties WHERE id = _property_id;
  IF prop IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF prop.status NOT IN ('available','for_sale','for_rent') THEN
    RAISE EXCEPTION 'Property is not available for new requests';
  END IF;

  SELECT * INTO agent_profile FROM public.profiles WHERE id = prop.agent_id;
  IF agent_profile IS NULL THEN RAISE EXCEPTION 'Agent profile missing'; END IF;
  IF agent_profile.user_id = buyer_uid THEN RAISE EXCEPTION 'You cannot request your own property'; END IF;

  SELECT id INTO existing FROM public.deal_requests
   WHERE buyer_id = buyer_uid AND property_id = _property_id AND status = 'pending'
   LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  INSERT INTO public.deal_requests (buyer_id, agent_user_id, agent_profile_id, property_id, property_code, buyer_message, status)
  VALUES (buyer_uid, agent_profile.user_id, agent_profile.id, prop.id, prop.property_code, _message, 'pending')
  RETURNING id INTO new_id;

  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (
    agent_profile.user_id,
    'New buyer interest 🤝',
    'A buyer has requested to proceed with "' || prop.title || '". Review and accept the deal to unlock secure payment.',
    'info',
    '/dashboard/agent/deals'
  );

  RETURN new_id;
END;
$$;

-- RPC: agent accepts a deal — creates the transaction & unlocks payment
CREATE OR REPLACE FUNCTION public.accept_deal(_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  prop RECORD;
  cs RECORD;
  commission BIGINT;
  tx_id UUID;
  agent_uid UUID := auth.uid();
BEGIN
  IF agent_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO req FROM public.deal_requests WHERE id = _request_id FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Deal request not found'; END IF;
  IF req.agent_user_id <> agent_uid AND NOT public.has_role(agent_uid, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Deal is no longer pending'; END IF;

  SELECT * INTO prop FROM public.properties WHERE id = req.property_id FOR UPDATE;
  IF prop IS NULL THEN RAISE EXCEPTION 'Property not found'; END IF;
  IF prop.status NOT IN ('available','for_sale','for_rent') THEN
    RAISE EXCEPTION 'Property is no longer available';
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
    req.buyer_id, req.agent_user_id, prop.id, prop.property_code,
    prop.price, commission, commission, prop.price,
    'pending_payment',
    CASE WHEN prop.status = 'for_rent' THEN 'rental' ELSE 'sale' END,
    'pending_payment',
    now() + interval '72 hours'
  )
  RETURNING id INTO tx_id;

  UPDATE public.properties SET status = 'payment_pending' WHERE id = prop.id;

  UPDATE public.deal_requests
    SET status = 'accepted', transaction_id = tx_id, accepted_at = now(), updated_at = now()
    WHERE id = _request_id;

  -- Auto-cancel any other pending requests on the same property
  UPDATE public.deal_requests
    SET status = 'cancelled', updated_at = now()
    WHERE property_id = prop.id AND status = 'pending' AND id <> _request_id;

  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (
    req.buyer_id,
    'Deal Accepted ✅ — Secure payment unlocked',
    'The agent has accepted your deal on "' || prop.title || '". You can now complete the secure payment.',
    'success',
    '/secure-payment/' || prop.id
  );

  RETURN tx_id;
END;
$$;

-- RPC: agent declines a deal
CREATE OR REPLACE FUNCTION public.decline_deal(_request_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  prop RECORD;
  agent_uid UUID := auth.uid();
BEGIN
  IF agent_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO req FROM public.deal_requests WHERE id = _request_id FOR UPDATE;
  IF req IS NULL THEN RAISE EXCEPTION 'Deal request not found'; END IF;
  IF req.agent_user_id <> agent_uid AND NOT public.has_role(agent_uid, 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'Deal is no longer pending'; END IF;

  UPDATE public.deal_requests
    SET status = 'declined', decline_reason = _reason, declined_at = now(), updated_at = now()
    WHERE id = _request_id;

  SELECT * INTO prop FROM public.properties WHERE id = req.property_id;

  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (
    req.buyer_id,
    'Deal Declined',
    'The agent declined your deal on "' || COALESCE(prop.title,'this property') || '". Reason: ' || COALESCE(_reason,'Not specified'),
    'warning',
    '/dashboard/buyer'
  );
END;
$$;
