
-- Fix 1: platform_settings should not be world-readable
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.platform_settings FROM anon;

-- Fix 2: hide payment_pending properties from public
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
CREATE POLICY "Properties are viewable by everyone"
  ON public.properties
  FOR SELECT
  USING (
    (status <> 'draft'::property_status
      AND status <> 'payment_pending'::property_status
    )
    OR agent_id = public.get_my_profile_id()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
