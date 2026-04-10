
-- Add status to chat_threads for restricted/active mode
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'restricted';

-- Add is_blocked to messages for contact-sharing filtering
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- Admin can view all chat threads
CREATE POLICY "Admins can view all threads"
ON public.chat_threads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
