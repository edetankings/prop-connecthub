
-- 1. deal_requests: add INSERT policy enforcing buyer_id = auth.uid()
CREATE POLICY "Buyers can create their own deal requests"
ON public.deal_requests
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

-- 2. platform_settings: restrict SELECT to admins; expose bank fields via SECURITY DEFINER function
DROP POLICY IF EXISTS "Authenticated users can read platform settings" ON public.platform_settings;

CREATE POLICY "Admins can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_company_payment_details()
RETURNS TABLE (
  company_account_name text,
  company_account_number text,
  company_bank_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_account_name, company_account_number, company_bank_name
  FROM public.platform_settings
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_company_payment_details() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_payment_details() TO authenticated;

-- 3. storage: add UPDATE policy on property-images scoped to the uploader's folder
DROP POLICY IF EXISTS "Users can update their own property images" ON storage.objects;

CREATE POLICY "Users can update their own property images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'property-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
