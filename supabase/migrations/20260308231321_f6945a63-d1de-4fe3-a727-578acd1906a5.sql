
-- Add type column to announcements for categorization
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'update';

-- Allow admins to update announcements
CREATE POLICY "Admins can update announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
