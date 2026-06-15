
CREATE OR REPLACE FUNCTION public.notify_kyc_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.kyc_verified IS DISTINCT FROM NEW.kyc_verified) THEN
    IF NEW.kyc_verified = true THEN
      UPDATE profiles
      SET trust_score = LEAST(COALESCE(trust_score, 0) + 35, 100)
      WHERE user_id = NEW.user_id;

      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        'KYC Verification Approved',
        'Your identity verification has been approved. You can now access all features.',
        'success',
        '/settings'
      );
    ELSE
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        NEW.user_id,
        'KYC Verification Required',
        'Please complete your identity verification to access all features.',
        'warning',
        '/identity-verification'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Also guard the admin update: ensure trust_score never exceeds the check bound
CREATE OR REPLACE FUNCTION public.clamp_profile_trust_score()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.trust_score IS NULL THEN
    NEW.trust_score := 0;
  ELSIF NEW.trust_score > 100 THEN
    NEW.trust_score := 100;
  ELSIF NEW.trust_score < 0 THEN
    NEW.trust_score := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clamp_profile_trust_score ON public.profiles;
CREATE TRIGGER trg_clamp_profile_trust_score
BEFORE INSERT OR UPDATE OF trust_score ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.clamp_profile_trust_score();
