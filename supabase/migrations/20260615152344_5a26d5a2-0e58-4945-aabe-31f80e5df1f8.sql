
-- 1) PROFILES: drop fully-public SELECT; require sign-in for the full row
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Safe public view for anon / non-authenticated browsing (homepage agent showcase, /agents, agent profile)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
  SELECT
    id,
    user_id,
    full_name,
    avatar_url,
    bio,
    profile_type,
    trust_score,
    kyc_verified,
    is_visible,
    properties_listed,
    completed_transactions,
    location,
    created_at
  FROM public.profiles
  WHERE is_visible = true;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) ANNOUNCEMENTS: only agents / admins may post
DROP POLICY IF EXISTS "Agents can create announcements" ON public.announcements;

CREATE POLICY "Agents and admins can create announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = public.get_my_profile_id()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = author_id
          AND p.profile_type = 'agent'
          AND p.kyc_verified = true
      )
    )
  );

-- 3) Fix mutable search_path on the trust-score clamp trigger function added earlier
CREATE OR REPLACE FUNCTION public.clamp_profile_trust_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
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
