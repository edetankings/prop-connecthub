
-- Create verification_steps table
CREATE TABLE public.verification_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  document_url text,
  rejection_reason text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, step_name)
);

ALTER TABLE public.verification_steps ENABLE ROW LEVEL SECURITY;

-- Users can view their own steps
CREATE POLICY "Users can view own verification steps"
  ON public.verification_steps FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own steps
CREATE POLICY "Users can insert own verification steps"
  ON public.verification_steps FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own steps
CREATE POLICY "Users can update own verification steps"
  ON public.verification_steps FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all steps
CREATE POLICY "Admins can view all verification steps"
  ON public.verification_steps FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can update all steps
CREATE POLICY "Admins can update all verification steps"
  ON public.verification_steps FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create verification-docs storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', true);

-- Storage policies for verification-docs
CREATE POLICY "Users can upload verification docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all verification docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'verification-docs' AND has_role(auth.uid(), 'admin'));
