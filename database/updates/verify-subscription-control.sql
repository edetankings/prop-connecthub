-- Regression checks using simulated authenticated roles and a temporary account.
-- Management API sessions cannot LOAD safeupdate; also verify saves in the admin UI.
-- All account, setting, audit, and notification writes are rolled back.
BEGIN;
DO $$
DECLARE
  admin_id uuid;
  fixture_user uuid := gen_random_uuid();
  fixture_profile uuid;
  affected integer;
  saved boolean;
BEGIN
  SELECT user_id INTO STRICT admin_id FROM public.user_roles WHERE role='admin' LIMIT 1;
  INSERT INTO auth.users(id,email,raw_user_meta_data)
    VALUES(fixture_user,'subscription-check-'||fixture_user||'@example.invalid',
      '{"full_name":"Subscription rollback fixture","profile_type":"agent"}'::jsonb);
  UPDATE public.profiles SET kyc_verified=true WHERE user_id=fixture_user RETURNING id INTO STRICT fixture_profile;

  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  -- Read in a separate statement so STABLE reads use the post-write snapshot.
  saved := public.set_subscriptions_enabled(false);
  IF saved IS DISTINCT FROM false OR public.get_subscriptions_enabled() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Administrator OFF persistence check failed';
  END IF;
  IF NOT prop_connect_private.can_list(fixture_profile) THEN
    RAISE EXCEPTION 'Verified agent without subscription must be allowed while OFF';
  END IF;

  PERFORM set_config('request.jwt.claim.sub',fixture_user::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',fixture_user,'role','authenticated')::text,true);
  BEGIN
    PERFORM public.set_subscriptions_enabled(true);
    RAISE EXCEPTION 'Non-admin setter unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.platform_settings SET subscriptions_enabled=true WHERE singleton=true;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Non-admin direct setting update unexpectedly succeeded'; END IF;
  BEGIN
    INSERT INTO public.subscription_requests(user_id,screenshot_url)
      VALUES(fixture_user,fixture_user||'/rollback-fixture.png');
    RAISE EXCEPTION 'Subscription request unexpectedly accepted while OFF';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'Subscriptions are currently disabled' THEN RAISE; END IF;
  END;

  EXECUTE 'RESET ROLE';
  UPDATE public.profiles SET profile_type='builder' WHERE id=fixture_profile;
  IF NOT prop_connect_private.can_list(fixture_profile) THEN
    RAISE EXCEPTION 'Verified builder must be allowed while OFF';
  END IF;
  UPDATE public.profiles SET kyc_verified=false WHERE id=fixture_profile;
  IF prop_connect_private.can_list(fixture_profile) THEN
    RAISE EXCEPTION 'Unverified professional unexpectedly allowed';
  END IF;
  UPDATE public.profiles SET kyc_verified=true WHERE id=fixture_profile;

  PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  saved := public.set_subscriptions_enabled(true);
  IF saved IS DISTINCT FROM true OR public.get_subscriptions_enabled() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Administrator ON persistence check failed';
  END IF;
  IF prop_connect_private.can_list(fixture_profile) THEN
    RAISE EXCEPTION 'Unsubscribed professional unexpectedly allowed while ON';
  END IF;
  EXECUTE 'RESET ROLE';

  IF has_function_privilege('anon','public.get_subscriptions_enabled()','EXECUTE')
    OR has_function_privilege('anon','public.set_subscriptions_enabled(boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous RPC access unexpectedly granted';
  END IF;
END $$;
ROLLBACK;

BEGIN READ ONLY;
SELECT jsonb_build_object(
  'checks','passed; test writes rolled back',
  'subscriptions_enabled',(SELECT subscriptions_enabled FROM public.platform_settings),
  'settings_rls',(SELECT relrowsecurity FROM pg_class WHERE oid='public.platform_settings'::regclass),
  'subscriptions_count',(SELECT count(*) FROM public.subscriptions),
  'requests_count',(SELECT count(*) FROM public.subscription_requests),
  'fixture_accounts_remaining',(SELECT count(*) FROM auth.users WHERE email LIKE 'subscription-check-%@example.invalid')
) AS verification;
COMMIT;
