
-- 1. Add matrix fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_level INTEGER,
  ADD COLUMN IF NOT EXISTS referral_position INTEGER;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 2. Withdrawals table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 5000),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. Unique constraint on earnings(transaction_id, user_id) for ON CONFLICT in trigger
CREATE UNIQUE INDEX IF NOT EXISTS uniq_earnings_tx_user
  ON public.earnings(transaction_id, user_id)
  WHERE transaction_id IS NOT NULL;

-- 4. Function to compute matrix placement (3x3, level 1-3) on referral signup
CREATE OR REPLACE FUNCTION public.place_in_matrix(_referrer_profile_id UUID)
RETURNS TABLE(parent_id UUID, lvl INTEGER, pos INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l1_count INTEGER;
  l1_child RECORD;
  l2_child RECORD;
BEGIN
  -- Try Level 1 (under referrer directly, max 3)
  SELECT COUNT(*) INTO l1_count
  FROM profiles
  WHERE referred_by = _referrer_profile_id AND referral_level = 1;

  IF l1_count < 3 THEN
    RETURN QUERY SELECT _referrer_profile_id, 1, l1_count + 1;
    RETURN;
  END IF;

  -- Try Level 2: scan referrer's L1 children for one with < 3 L1-of-their-own
  FOR l1_child IN
    SELECT id FROM profiles
    WHERE referred_by = _referrer_profile_id AND referral_level = 1
    ORDER BY referral_position
  LOOP
    SELECT COUNT(*) INTO l1_count
    FROM profiles WHERE referred_by = l1_child.id AND referral_level = 1;
    IF l1_count < 3 THEN
      -- Place as L2 of original referrer (parent = l1_child, level=2 relative to top)
      RETURN QUERY SELECT l1_child.id, 2, l1_count + 1;
      RETURN;
    END IF;
  END LOOP;

  -- Try Level 3
  FOR l1_child IN
    SELECT id FROM profiles
    WHERE referred_by = _referrer_profile_id AND referral_level = 1
    ORDER BY referral_position
  LOOP
    FOR l2_child IN
      SELECT id FROM profiles
      WHERE referred_by = l1_child.id AND referral_level = 1
      ORDER BY referral_position
    LOOP
      SELECT COUNT(*) INTO l1_count
      FROM profiles WHERE referred_by = l2_child.id AND referral_level = 1;
      IF l1_count < 3 THEN
        RETURN QUERY SELECT l2_child.id, 3, l1_count + 1;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;

  -- Matrix full → return NULLs (caller will keep referred_by but no level)
  RETURN QUERY SELECT _referrer_profile_id, NULL::INTEGER, NULL::INTEGER;
END;
$$;

-- 5. Trigger to auto-place new profiles into matrix on insert
CREATE OR REPLACE FUNCTION public.auto_place_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  placement RECORD;
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referral_level IS NULL THEN
    SELECT * INTO placement FROM public.place_in_matrix(NEW.referred_by);
    IF placement.lvl IS NOT NULL THEN
      NEW.referred_by := placement.parent_id;
      NEW.referral_level := placement.lvl;
      NEW.referral_position := placement.pos;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_place_referral ON public.profiles;
CREATE TRIGGER trg_auto_place_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_place_referral();

-- 6. Update referral reward trigger: tiered by level (L1 100%, L2 50%, L3 25%)
CREATE OR REPLACE FUNCTION public.reward_referrer_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_profile RECORD;
  current_parent_id UUID;
  current_level INTEGER := 1;
  parent_profile RECORD;
  base_amount BIGINT;
  reward_amount BIGINT;
  reward_type TEXT;
  multiplier NUMERIC;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  IF NEW.type = 'rent' THEN
    base_amount := 10000;
    reward_type := 'rent_reward';
  ELSIF NEW.type IN ('sale','purchase') THEN
    base_amount := 50000;
    reward_type := 'sale_reward';
  ELSE
    RETURN NEW;
  END IF;

  SELECT * INTO buyer_profile FROM profiles WHERE user_id = NEW.buyer_id;
  IF buyer_profile IS NULL THEN RETURN NEW; END IF;
  current_parent_id := buyer_profile.referred_by;

  WHILE current_parent_id IS NOT NULL AND current_level <= 3 LOOP
    SELECT * INTO parent_profile FROM profiles WHERE id = current_parent_id;
    EXIT WHEN parent_profile IS NULL;

    IF parent_profile.profile_type = 'agent' AND parent_profile.kyc_verified = true THEN
      multiplier := CASE current_level WHEN 1 THEN 1.0 WHEN 2 THEN 0.5 ELSE 0.25 END;
      reward_amount := (base_amount * multiplier)::BIGINT;

      INSERT INTO earnings (user_id, amount, type, description, transaction_id)
      VALUES (
        parent_profile.user_id,
        reward_amount,
        CASE WHEN current_level = 1 THEN reward_type ELSE 'referral' END,
        'Level ' || current_level || ' referral reward (' || NEW.type || ')',
        NEW.id
      )
      ON CONFLICT (transaction_id, user_id) DO NOTHING;

      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        parent_profile.user_id,
        'Referral Reward Earned!',
        'You earned ₦' || reward_amount || ' from your Level ' || current_level || ' downline.',
        'success',
        '/earnings'
      );
    END IF;

    current_parent_id := parent_profile.referred_by;
    current_level := current_level + 1;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_referrer ON public.transactions;
CREATE TRIGGER trg_reward_referrer
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.reward_referrer_on_transaction();
