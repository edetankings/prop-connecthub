-- Fix subscription saves through APIs that enforce pg-safeupdate.
-- Apply after 20261026_subscription_control.sql; preserves the current setting.
BEGIN;
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
NOTIFY pgrst, 'reload schema';
COMMIT;
