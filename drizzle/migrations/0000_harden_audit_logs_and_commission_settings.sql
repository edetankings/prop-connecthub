DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_action(_action text, _details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF _action IS NULL OR length(trim(_action)) = 0 OR length(_action) > 120 THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;
  INSERT INTO public.audit_logs(user_id, action, details)
  VALUES (auth.uid(), _action, COALESCE(_details, '{}'::jsonb));
END;
$$;

DROP POLICY IF EXISTS "Anyone can read commission settings" ON public.commission_settings;
CREATE POLICY "Authenticated users can read commission settings"
ON public.commission_settings
FOR SELECT
TO authenticated
USING (true);
REVOKE SELECT ON public.commission_settings FROM anon;