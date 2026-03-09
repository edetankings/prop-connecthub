-- Add explicit deny policy so linter is satisfied while keeping this table inaccessible to clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'phone_otp_challenges'
      AND policyname = 'No client access'
  ) THEN
    CREATE POLICY "No client access"
    ON public.phone_otp_challenges
    FOR ALL
    TO public
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;