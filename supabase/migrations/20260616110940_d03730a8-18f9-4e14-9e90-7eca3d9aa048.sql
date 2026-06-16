
-- 1. Recreate public_profiles view as security_invoker (no SECURITY DEFINER behavior)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, user_id, full_name, avatar_url, bio, profile_type, trust_score,
       kyc_verified, is_visible, properties_listed, completed_transactions,
       location, created_at
FROM public.profiles
WHERE is_visible = true;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2. Tighten profiles SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Extend trigger to also block self-changes to profile_type
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_field_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.user_id THEN
    IF (NEW.profile_type IS DISTINCT FROM OLD.profile_type)
      OR (NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified)
      OR (NEW.trust_score IS DISTINCT FROM OLD.trust_score)
      OR (NEW.properties_listed IS DISTINCT FROM OLD.properties_listed)
      OR (NEW.completed_transactions IS DISTINCT FROM OLD.completed_transactions)
      OR (NEW.is_visible IS DISTINCT FROM OLD.is_visible)
      OR (NEW.phone_verified IS DISTINCT FROM OLD.phone_verified)
      OR (NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at)
      OR (NEW.referred_by IS DISTINCT FROM OLD.referred_by)
      OR (NEW.referral_code IS DISTINCT FROM OLD.referral_code)
    THEN
      RAISE EXCEPTION 'permission denied';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'permission denied';
END;
$$;

-- 4. Restrict property-images uploads to the user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;

CREATE POLICY "Users can upload property images to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Tighten payment-screenshots & verification-docs SELECT (buckets will be made private)
DROP POLICY IF EXISTS "Payment screenshots are viewable" ON storage.objects;

CREATE POLICY "Users can view own payment screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can view all verification docs (alt)"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-docs'
  AND public.has_role(auth.uid(), 'admin')
);
