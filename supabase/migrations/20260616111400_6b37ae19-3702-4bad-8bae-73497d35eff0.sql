
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT id, user_id, full_name, avatar_url, bio, profile_type, trust_score,
       kyc_verified, is_visible, properties_listed, completed_transactions,
       location, created_at, referred_by, referral_code
FROM public.profiles
WHERE is_visible = true;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
