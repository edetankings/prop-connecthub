-- The previous single policy called get_my_profile_id() for every reader, including
-- anonymous ones. Split it so anonymous visitors are evaluated with a simple
-- status check and only signed-in users touch the owner/admin helper functions.
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;

CREATE POLICY "Public can view live listings"
ON public.properties
FOR SELECT
TO anon
USING (
  status <> 'draft'::property_status
  AND status <> 'payment_pending'::property_status
);

CREATE POLICY "Signed-in users can view listings, own drafts and admin view"
ON public.properties
FOR SELECT
TO authenticated
USING (
  (status <> 'draft'::property_status AND status <> 'payment_pending'::property_status)
  OR agent_id = public.get_my_profile_id()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);