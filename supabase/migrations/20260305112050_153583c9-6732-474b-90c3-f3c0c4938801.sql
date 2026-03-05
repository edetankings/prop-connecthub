
-- Fix overly permissive notification insert policy
DROP POLICY "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also allow admins to insert notifications for any user
CREATE POLICY "Admins can insert any notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));
