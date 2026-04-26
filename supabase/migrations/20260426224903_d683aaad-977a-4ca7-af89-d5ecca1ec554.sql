
-- 1. property_documents table
CREATE TABLE public.property_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  document_type TEXT NOT NULL DEFAULT 'other',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_documents_property_id ON public.property_documents(property_id);

ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can insert own property documents"
ON public.property_documents FOR INSERT TO authenticated
WITH CHECK (agent_id = public.get_my_profile_id());

CREATE POLICY "Agents can view own documents"
ON public.property_documents FOR SELECT TO authenticated
USING (agent_id = public.get_my_profile_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can delete own documents"
ON public.property_documents FOR DELETE TO authenticated
USING (agent_id = public.get_my_profile_id() OR public.has_role(auth.uid(), 'admin'));

-- 2. Storage bucket for property documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: files stored under {agent_user_id}/{property_id}/{filename}
CREATE POLICY "Agents upload own property docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'property-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Agents view own property docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'property-documents'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Agents delete own property docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'property-documents'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

-- 3. Notify agent when property is approved/rejected (already partially exists, ensure trigger active)
DROP TRIGGER IF EXISTS trg_notify_property_status ON public.properties;
CREATE TRIGGER trg_notify_property_status
AFTER UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.notify_property_status_change();
