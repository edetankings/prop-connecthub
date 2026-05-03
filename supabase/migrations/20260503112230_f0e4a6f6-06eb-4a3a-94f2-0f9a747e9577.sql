
CREATE OR REPLACE FUNCTION public.pay_verification_referral_bonus(_referred_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_profile RECORD;
  referrer_profile RECORD;
  has_active_sub boolean;
  already_paid boolean;
BEGIN
  SELECT * INTO ref_profile FROM profiles WHERE user_id = _referred_user_id;
  IF ref_profile IS NULL THEN RETURN; END IF;
  IF ref_profile.profile_type <> 'agent' THEN RETURN; END IF;
  IF NOT ref_profile.kyc_verified THEN RETURN; END IF;
  IF ref_profile.referred_by IS NULL THEN RETURN; END IF;

  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = _referred_user_id AND status = 'active' AND end_date >= now()
  ) INTO has_active_sub;
  IF NOT has_active_sub THEN RETURN; END IF;

  SELECT * INTO referrer_profile FROM profiles WHERE id = ref_profile.referred_by;
  IF referrer_profile IS NULL THEN RETURN; END IF;

  SELECT EXISTS(
    SELECT 1 FROM earnings
    WHERE type = 'verification_referral_bonus'
      AND from_user_id = _referred_user_id
  ) INTO already_paid;
  IF already_paid THEN RETURN; END IF;

  INSERT INTO earnings (user_id, amount, type, source, level, from_user_id, description)
  VALUES (
    referrer_profile.user_id,
    1000,
    'verification_referral_bonus',
    'referral',
    1,
    _referred_user_id,
    'Verification + subscription referral bonus'
  );

  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    referrer_profile.user_id,
    'Referral Verification Bonus! 🎉',
    '₦1,000 earned: your referred agent completed KYC and subscribed.',
    'success',
    '/earnings'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.on_kyc_verified_pay_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.kyc_verified = true AND (OLD.kyc_verified IS DISTINCT FROM NEW.kyc_verified) THEN
    PERFORM public.pay_verification_referral_bonus(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_subscription_active_pay_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM public.pay_verification_referral_bonus(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kyc_verified_referral ON public.profiles;
CREATE TRIGGER trg_kyc_verified_referral
AFTER UPDATE OF kyc_verified ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_kyc_verified_pay_referral();

DROP TRIGGER IF EXISTS trg_sub_active_referral ON public.subscriptions;
CREATE TRIGGER trg_sub_active_referral
AFTER INSERT OR UPDATE OF status ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.on_subscription_active_pay_referral();
