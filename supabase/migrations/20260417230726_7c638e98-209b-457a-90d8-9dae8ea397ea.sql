
-- Fire matrix placement on UPDATE too (when referred_by gets set after insert)
CREATE OR REPLACE FUNCTION public.auto_place_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  placement RECORD;
  ref_id UUID;
BEGIN
  -- Only act when referred_by is being set (insert with value, or update setting it)
  IF NEW.referred_by IS NULL THEN RETURN NEW; END IF;
  IF NEW.referral_level IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.referred_by IS NOT NULL THEN RETURN NEW; END IF;

  -- Prevent self-referral
  IF NEW.referred_by = NEW.id THEN
    NEW.referred_by := NULL;
    RETURN NEW;
  END IF;

  SELECT * INTO placement FROM public.place_in_matrix(NEW.referred_by);
  IF placement.lvl IS NOT NULL THEN
    NEW.referred_by := placement.parent_id;
    NEW.referral_level := placement.lvl;
    NEW.referral_position := placement.pos;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_place_referral ON public.profiles;
CREATE TRIGGER trg_auto_place_referral
  BEFORE INSERT OR UPDATE OF referred_by ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_place_referral();

-- Also have handle_new_user attempt to attach referrer from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  initial_trust_score INTEGER := 0;
  ref_code TEXT;
  ref_profile_id UUID;
BEGIN
  IF COALESCE((NEW.raw_user_meta_data->>'profile_type')::profile_type, 'buyer') = 'agent' THEN
    initial_trust_score := 50;
  END IF;

  ref_code := NULLIF(NEW.raw_user_meta_data->>'referral_code', '');
  IF ref_code IS NOT NULL THEN
    SELECT id INTO ref_profile_id FROM public.profiles WHERE referral_code = ref_code LIMIT 1;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, profile_type, phone, trust_score, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'profile_type')::profile_type, 'buyer'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    initial_trust_score,
    ref_profile_id
  );
  RETURN NEW;
END;
$$;
