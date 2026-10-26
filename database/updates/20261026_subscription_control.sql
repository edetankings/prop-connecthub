-- Apply once to the independent baseline database. Do not replay historical migrations.
BEGIN;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS subscriptions_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_subscriptions_enabled() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE enabled boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT subscriptions_enabled INTO STRICT enabled FROM public.platform_settings;
  RETURN enabled;
END $$;

CREATE OR REPLACE FUNCTION public.set_subscriptions_enabled(_enabled boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM prop_connect_private.assert_admin();
  IF _enabled IS NULL THEN RAISE EXCEPTION 'Subscription setting required'; END IF;
  UPDATE public.platform_settings SET subscriptions_enabled=_enabled, updated_by=auth.uid()
    WHERE singleton=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Platform settings missing'; END IF;
  PERFORM public.log_admin_action('set_subscriptions_enabled',jsonb_build_object('enabled',_enabled));
  RETURN _enabled;
END $$;

REVOKE ALL ON FUNCTION public.get_subscriptions_enabled(),public.set_subscriptions_enabled(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscriptions_enabled(),public.set_subscriptions_enabled(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION prop_connect_private.can_list(_profile uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    CROSS JOIN public.platform_settings cfg
    WHERE p.id=_profile AND p.profile_type IN ('agent','builder') AND p.kyc_verified
      AND (NOT cfg.subscriptions_enabled OR EXISTS(
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id=p.user_id AND s.status='active' AND s.end_date>now()
      ))
  );
$$;

-- Stop new payment-proof requests while OFF, including direct API inserts.
-- Existing pending proofs can still be reviewed; paid subscription records stay intact.
CREATE OR REPLACE FUNCTION prop_connect_private.guard_subscription_request() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.platform_settings WHERE subscriptions_enabled FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscriptions are currently disabled'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION prop_connect_private.guard_subscription_request() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS subscription_setting_guard ON public.subscription_requests;
CREATE TRIGGER subscription_setting_guard BEFORE INSERT ON public.subscription_requests
  FOR EACH ROW EXECUTE FUNCTION prop_connect_private.guard_subscription_request();

NOTIFY pgrst, 'reload schema';
COMMIT;
