-- Phone verification support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at timestamp with time zone;

-- Store OTP challenges (no client access; used by backend functions)
CREATE TABLE IF NOT EXISTS public.phone_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  phone text NOT NULL,
  purpose text NOT NULL DEFAULT 'verify_phone',
  otp_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otp_challenges_phone_purpose_idx
ON public.phone_otp_challenges (phone, purpose, expires_at DESC);

ALTER TABLE public.phone_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Ensure profiles capture phone provided at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, profile_type, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'profile_type')::profile_type, 'buyer'),
    NULLIF(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$function$;

-- Prevent users from self-setting verification/trust flags
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- service role / backend jobs (auth.uid() is NULL) can update
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- admins can update
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- user can only update their profile, but not sensitive fields
  IF auth.uid() = OLD.user_id THEN
    IF (NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified)
      OR (NEW.trust_score IS DISTINCT FROM OLD.trust_score)
      OR (NEW.properties_listed IS DISTINCT FROM OLD.properties_listed)
      OR (NEW.completed_transactions IS DISTINCT FROM OLD.completed_transactions)
      OR (NEW.is_visible IS DISTINCT FROM OLD.is_visible)
      OR (NEW.phone_verified IS DISTINCT FROM OLD.phone_verified)
      OR (NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at)
    THEN
      RAISE EXCEPTION 'permission denied';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'permission denied';
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_profile_sensitive_field_updates_trg'
  ) THEN
    CREATE TRIGGER prevent_profile_sensitive_field_updates_trg
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_sensitive_field_updates();
  END IF;
END $$;