-- READ ONLY post-install inspection. Run before accounts, traffic, or business activation.
BEGIN READ ONLY;
SELECT revision,installed_at FROM prop_connect_private.installation_history;
SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;
SELECT 'table_count_30' AS check_name,count(*)=30 AS passed
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r';
SELECT 'all_tables_have_rls' AS check_name,bool_and(c.relrowsecurity) AS passed
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r';
SELECT c.relname,co.conname,co.convalidated,pg_get_constraintdef(co.oid) AS definition
FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' ORDER BY c.relname,co.conname;
SELECT 'no_unvalidated_constraints' AS check_name,NOT EXISTS(
 SELECT 1 FROM pg_constraint co JOIN pg_namespace n ON n.oid=co.connamespace
 WHERE n.nspname='public' AND NOT co.convalidated) AS passed;
SELECT 'private_profile_fields_not_public' AS check_name,NOT EXISTS(
 SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='public_profiles'
 AND column_name IN ('user_id','phone','referred_by','referral_code','invited_by','phone_verified_at')) AS passed;
SELECT 'no_anon_profile_table_access' AS check_name,NOT has_table_privilege('anon','public.profiles','SELECT') AS passed;
SELECT id,public FROM storage.buckets ORDER BY id;
SELECT 'six_buckets_four_private' AS check_name,count(*)=6 AND count(*) FILTER(WHERE NOT public)=4 AS passed FROM storage.buckets;
SELECT 'sensitive_buckets_private' AS check_name,NOT EXISTS(SELECT 1 FROM storage.buckets
 WHERE id IN ('verification-docs','payment-screenshots','property-documents','chat-attachments') AND public) AS passed;
SELECT n.nspname,c.relname,t.tgname,p.oid::regprocedure AS function_signature
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND n.nspname IN ('public','auth') ORDER BY c.relname,t.tgname;
SELECT p.oid::regprocedure AS signature,p.prosecdef,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','prop_connect_private') ORDER BY (p.oid::regprocedure)::text;
SELECT schemaname,tablename,policyname,cmd,roles,qual,with_check FROM pg_policies
WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname;
SELECT pubname,schemaname,tablename FROM pg_publication_tables WHERE pubname='supabase_realtime';
SELECT 'unconfigured_finance_locked' AS check_name,count(*)=1 AND bool_and(NOT money_rules_approved AND NOT referral_rules_approved
 AND monetary_unit IS NULL AND verification_bonus_policy IS NULL AND company_account_number IS NULL) AS passed FROM public.platform_settings;
SELECT 'company_wallet_zero_singleton' AS check_name,count(*)=1 AND bool_and(balance=0 AND total_earned=0) AS passed FROM public.company_wallet;
SELECT 'commission_singleton' AS check_name,count(*)=1 AS passed FROM public.commission_settings;
SELECT 'no_seeded_roles' AS check_name,count(*)=0 AS passed FROM public.user_roles;
SELECT 'no_seeded_profiles' AS check_name,count(*)=0 AS passed FROM public.profiles;
SELECT 'no_seeded_money_events' AS check_name,
 (SELECT count(*) FROM public.transactions)+(SELECT count(*) FROM public.earnings)+
 (SELECT count(*) FROM public.withdrawals)+(SELECT count(*) FROM public.escrow_holds)=0 AS passed;
SELECT 'no_seeded_external_receipts' AS check_name,count(*)=0 AS passed FROM prop_connect_private.payment_receipts;
ROLLBACK;
