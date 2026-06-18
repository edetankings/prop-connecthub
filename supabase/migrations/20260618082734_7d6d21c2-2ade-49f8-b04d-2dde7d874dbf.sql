
-- Property documents: explicit UPDATE policy restricted to the owning agent
DROP POLICY IF EXISTS "Agents can update their own property documents" ON public.property_documents;
CREATE POLICY "Agents can update their own property documents"
ON public.property_documents
FOR UPDATE
TO authenticated
USING (agent_id = public.get_my_profile_id())
WITH CHECK (agent_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "Agents can delete their own property documents" ON public.property_documents;
CREATE POLICY "Agents can delete their own property documents"
ON public.property_documents
FOR DELETE
TO authenticated
USING (agent_id = public.get_my_profile_id());

-- payment-screenshots: explicit UPDATE/DELETE policies restricted to owner folder
DROP POLICY IF EXISTS "Users can update their own payment screenshots" ON storage.objects;
CREATE POLICY "Users can update their own payment screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own payment screenshots" ON storage.objects;
CREATE POLICY "Users can delete their own payment screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
