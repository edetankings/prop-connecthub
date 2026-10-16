-- Aggregate and catalog observations only. Not an authenticated application test.
-- Runner must verify prtrpywkwmnpowrthppg before invoking the CLI with that explicit ref.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SELECT jsonb_build_object(
  'read_only', current_setting('transaction_read_only'),
  'accounts', jsonb_build_object(
    'auth_count', (SELECT count(*) FROM auth.users),
    'profile_count', (SELECT count(*) FROM public.profiles),
    'missing_profiles', (SELECT count(*) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id)),
    'orphan_profiles', (SELECT count(*) FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id)),
    'admin_role_count', (SELECT count(*) FROM public.user_roles WHERE role = 'admin')),
  'profile_types', (SELECT jsonb_object_agg(profile_type, total) FROM (SELECT profile_type, count(*) AS total FROM public.profiles GROUP BY profile_type) AS counts),
  'financial', (SELECT jsonb_build_object(
    'settings_count', count(*),
    'money_locked', bool_and(NOT money_rules_approved),
    'referrals_locked', bool_and(NOT referral_rules_approved),
    'bank_unconfigured', bool_and(company_account_number IS NULL),
    'verification_bonus_disabled', bool_and(verification_bonus_policy IS NULL)) FROM public.platform_settings),
  'wallets_zero', (SELECT coalesce(bool_and(balance = 0 AND escrow_balance = 0 AND withdrawal_reserved = 0), true) FROM public.wallets),
  'buckets', (SELECT jsonb_agg(jsonb_build_object('id', b.id, 'public', b.public, 'mime_types', b.allowed_mime_types,
    'size_limit', b.file_size_limit, 'object_count', (SELECT count(*) FROM storage.objects o WHERE o.bucket_id = b.id)) ORDER BY b.id) FROM storage.buckets b),
  'storage_rls', (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'storage' AND c.relname = 'objects'),
  'realtime', (SELECT jsonb_agg(tablename ORDER BY tablename) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public'),
  'function_hashes', (SELECT jsonb_object_agg(p.oid::regprocedure::text, md5(p.prosrc)) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'prop_connect_private')),
  'public_rls', (SELECT bool_and(c.relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')),
  'public_table_count', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')),
  'financial_table_grants', (SELECT jsonb_agg(jsonb_build_object('table', c.relname,
    'insert', has_table_privilege('authenticated', c.oid, 'INSERT'), 'update', has_table_privilege('authenticated', c.oid, 'UPDATE'),
    'delete', has_table_privilege('authenticated', c.oid, 'DELETE')) ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('wallets', 'transactions', 'earnings', 'withdrawals', 'subscriptions', 'escrow_holds'))
) AS audit;
COMMIT;
