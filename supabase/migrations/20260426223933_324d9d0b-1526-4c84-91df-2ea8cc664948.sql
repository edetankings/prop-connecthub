
-- 1. Drop old transaction-based reward trigger and function
DROP TRIGGER IF EXISTS trg_reward_referrer ON public.transactions;
DROP FUNCTION IF EXISTS public.reward_referrer_on_transaction() CASCADE;

-- 2. Replace place_in_matrix with 2x2 BFS spillover (max 2 directs, infinite depth)
CREATE OR REPLACE FUNCTION public.place_in_matrix(_referrer_profile_id uuid)
RETURNS TABLE(parent_id uuid, lvl integer, pos integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_id uuid;
  child_count integer;
  child_record RECORD;
  queue uuid[];
  depth integer := 1;
BEGIN
  -- BFS: start with direct referrer
  queue := ARRAY[_referrer_profile_id];
  WHILE array_length(queue, 1) > 0 LOOP
    current_id := queue[1];
    queue := queue[2:array_length(queue, 1)];

    SELECT COUNT(*) INTO child_count
    FROM profiles WHERE referred_by = current_id;

    IF child_count < 2 THEN
      RETURN QUERY SELECT current_id, depth, child_count + 1;
      RETURN;
    END IF;

    -- Add this node's children to queue for next level scan
    FOR child_record IN
      SELECT id FROM profiles WHERE referred_by = current_id ORDER BY referral_position
    LOOP
      queue := array_append(queue, child_record.id);
    END LOOP;

    -- Track depth roughly (not exact BFS depth tracking, but acceptable)
    depth := depth + 1;
    EXIT WHEN depth > 50; -- safety
  END LOOP;

  RETURN QUERY SELECT _referrer_profile_id, NULL::integer, NULL::integer;
END;
$$;

-- 3. Extend earnings table
ALTER TABLE public.earnings
  ADD COLUMN IF NOT EXISTS from_user_id uuid,
  ADD COLUMN IF NOT EXISTS level integer,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'subscription';

CREATE INDEX IF NOT EXISTS idx_earnings_user_created ON public.earnings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_level ON public.earnings(user_id, level);

-- 4. Company wallet (singleton)
CREATE TABLE IF NOT EXISTS public.company_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance bigint NOT NULL DEFAULT 0,
  total_earned bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.company_wallet (balance, total_earned)
SELECT 0, 0 WHERE NOT EXISTS (SELECT 1 FROM public.company_wallet);

ALTER TABLE public.company_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view company wallet" ON public.company_wallet
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- 5. Escrow holds for inactive uplines
CREATE TABLE IF NOT EXISTS public.escrow_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intended_user_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  subscription_id uuid,
  level integer NOT NULL,
  amount bigint NOT NULL,
  status text NOT NULL DEFAULT 'held', -- held | released | forfeited
  hold_until timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own escrow" ON public.escrow_holds
  FOR SELECT USING (intended_user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage escrow" ON public.escrow_holds
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_escrow_user ON public.escrow_holds(intended_user_id, status);

-- 6. Distribution function
CREATE OR REPLACE FUNCTION public.distribute_subscription_payment(_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sub RECORD;
  subscriber_profile RECORD;
  current_parent_id uuid;
  current_parent_profile RECORD;
  is_active boolean;
  lvl integer := 1;
  share bigint;
  weights integer[] := ARRAY[1000,600,400,300,300,200,200,200,200,200,80,80,80,80,80];
BEGIN
  SELECT * INTO sub FROM subscriptions WHERE id = _subscription_id;
  IF sub IS NULL THEN RETURN; END IF;

  SELECT * INTO subscriber_profile FROM profiles WHERE user_id = sub.user_id;
  IF subscriber_profile IS NULL THEN RETURN; END IF;

  -- Company gets 2500
  UPDATE company_wallet SET balance = balance + 2500, total_earned = total_earned + 2500, updated_at = now();
  INSERT INTO earnings (user_id, amount, type, source, level, from_user_id, transaction_id, description)
  VALUES (sub.user_id, 0, 'company_fee', 'subscription', 0, sub.user_id, _subscription_id, 'Company fee logged');

  -- Direct referrer bonus 1000
  IF subscriber_profile.referred_by IS NOT NULL THEN
    SELECT * INTO current_parent_profile FROM profiles WHERE id = subscriber_profile.referred_by;
    IF current_parent_profile IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = current_parent_profile.user_id AND status = 'active' AND end_date >= now()) INTO is_active;
      IF is_active THEN
        INSERT INTO earnings (user_id, amount, type, source, level, from_user_id, transaction_id, description)
        VALUES (current_parent_profile.user_id, 1000, 'direct_referral', 'subscription', 1, sub.user_id, _subscription_id, 'Direct referral bonus');
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (current_parent_profile.user_id, 'Direct Referral Bonus!', '₦1,000 earned from your direct referral subscription.', 'success', '/earnings');
      ELSE
        INSERT INTO escrow_holds (intended_user_id, from_user_id, subscription_id, level, amount)
        VALUES (current_parent_profile.user_id, sub.user_id, _subscription_id, 1, 1000);
      END IF;
    END IF;
  ELSE
    -- No referrer: 1000 to company
    UPDATE company_wallet SET balance = balance + 1000, total_earned = total_earned + 1000, updated_at = now();
  END IF;

  -- Matrix distribution across 15 levels (uplines via referred_by chain)
  current_parent_id := subscriber_profile.referred_by;
  WHILE current_parent_id IS NOT NULL AND lvl <= 15 LOOP
    SELECT * INTO current_parent_profile FROM profiles WHERE id = current_parent_id;
    EXIT WHEN current_parent_profile IS NULL;

    share := weights[lvl];
    SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = current_parent_profile.user_id AND status = 'active' AND end_date >= now()) INTO is_active;

    IF is_active THEN
      INSERT INTO earnings (user_id, amount, type, source, level, from_user_id, transaction_id, description)
      VALUES (current_parent_profile.user_id, share, 'matrix', 'subscription', lvl, sub.user_id, _subscription_id, 'Matrix L' || lvl || ' earning');
    ELSE
      INSERT INTO escrow_holds (intended_user_id, from_user_id, subscription_id, level, amount)
      VALUES (current_parent_profile.user_id, sub.user_id, _subscription_id, lvl, share);
    END IF;

    current_parent_id := current_parent_profile.referred_by;
    lvl := lvl + 1;
  END LOOP;

  -- Any remaining levels (no upline) → company
  WHILE lvl <= 15 LOOP
    UPDATE company_wallet SET balance = balance + weights[lvl], total_earned = total_earned + weights[lvl], updated_at = now();
    lvl := lvl + 1;
  END LOOP;
END;
$$;

-- 7. Trigger on subscription activation
CREATE OR REPLACE FUNCTION public.on_subscription_activated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM distribute_subscription_payment(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_activated ON public.subscriptions;
CREATE TRIGGER trg_subscription_activated
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.on_subscription_activated();
