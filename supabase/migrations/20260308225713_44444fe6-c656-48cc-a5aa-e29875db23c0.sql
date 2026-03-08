
-- Add name and email columns to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS email text;

-- Allow admins to update support tickets (mark as read, etc.)
CREATE POLICY "Admins can update support tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete support tickets
CREATE POLICY "Admins can delete support tickets"
ON public.support_tickets
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
