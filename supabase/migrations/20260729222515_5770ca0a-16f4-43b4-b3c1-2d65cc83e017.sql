DROP POLICY IF EXISTS "Authenticated users can read chat attachments" ON storage.objects;

CREATE POLICY "Chat participants can read chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.chat_threads t
      JOIN public.profiles me ON me.user_id = auth.uid()
      JOIN public.profiles up ON up.user_id::text = (storage.foldername(name))[1]
      WHERE (t.buyer_id = me.id AND t.agent_id = up.id)
         OR (t.agent_id = me.id AND t.buyer_id = up.id)
    )
  )
);