-- 1) Trigger-only functions: never callable over the API.
--    Postgres does not require EXECUTE for trigger firing, so this is safe.
DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND pg_get_function_result(p.oid) = 'trigger'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
  END LOOP;
END $$;

-- 2) Internal helpers: only reachable from SECURITY DEFINER callers / cron.
REVOKE ALL ON FUNCTION public.ensure_wallet(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.distribute_subscription_payment(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pay_verification_referral_bonus(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.place_in_matrix(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_property_code(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.state_code_for(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_admin_action(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_stale_transactions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_wallet(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_transactions() TO service_role, postgres;

-- 3) Signed-in-only business RPCs: remove anonymous reachability.
REVOKE ALL ON FUNCTION public.accept_deal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_deal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_deal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.raise_dispute(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_secure_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_company_payment_details() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_profile_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_last_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_deal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_deal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_deal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.raise_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_secure_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_payment_details() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_login() TO authenticated;

-- 4) Admin-only RPCs (they also assert has_role internally).
REVOKE ALL ON FUNCTION public.approve_secure_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_secure_payment(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refund_secure_payment(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_withdrawal(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_dispute(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_secure_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_secure_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_secure_payment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) TO authenticated;

-- 5) Intentionally public / RLS-critical surface, granted explicitly.
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.initiate_secure_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_proof(uuid, text) TO authenticated;

-- 6) Stop future functions from being world-executable by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;