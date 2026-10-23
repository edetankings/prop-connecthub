-- Access audit: metadata and aggregate integrity checks only; never run migrations.
-- Execute only with the explicitly verified independent project reference.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='5s';
SELECT jsonb_build_object(
 'read_only',current_setting('transaction_read_only'),
 'tables',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'rls',c.relrowsecurity,
   'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
   'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),
   'authenticated_insert',has_table_privilege('authenticated',c.oid,'INSERT'),
   'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE'),
   'authenticated_delete',has_table_privilege('authenticated',c.oid,'DELETE')) ORDER BY n.nspname,c.relname)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('public','prop_connect_private') AND c.relkind IN ('r','p')),
 'policies',(SELECT jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,'name',policyname,
   'roles',roles,'command',cmd,'using',qual,'check',with_check) ORDER BY schemaname,tablename,policyname)
   FROM pg_policies WHERE schemaname IN ('public','storage')),
 'functions',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,
   'signature',p.oid::regprocedure::text,'security_definer',p.prosecdef,'volatility',p.provolatile,
   'body_md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),
   'search_path',(SELECT s FROM unnest(p.proconfig) AS s WHERE s LIKE 'search_path=%' LIMIT 1),
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE')) ORDER BY n.nspname,p.proname)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname IN ('public','prop_connect_private')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,
   'enabled',t.tgenabled,'function_schema',fn.nspname,'function',p.proname) ORDER BY n.nspname,c.relname,t.tgname)
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=p.pronamespace
   WHERE NOT t.tgisinternal AND n.nspname IN ('public','auth')),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'mime_types',b.allowed_mime_types,
   'bucket_size_limit',b.file_size_limit,'object_count',(SELECT count(*) FROM storage.objects o WHERE o.bucket_id=b.id)) ORDER BY b.id) FROM storage.buckets b),
 'realtime',(SELECT jsonb_agg(jsonb_build_object('publication',pubname,'schema',schemaname,'table',tablename)
   ORDER BY schemaname,tablename) FROM pg_publication_tables WHERE pubname='supabase_realtime'),
 'profile_integrity',jsonb_build_object(
   'auth_accounts',(SELECT count(*) FROM auth.users),
   'profiles',(SELECT count(*) FROM public.profiles),
   'auth_accounts_without_profile',(SELECT count(*) FROM auth.users u WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=u.id)),
   'orphan_profiles',(SELECT count(*) FROM public.profiles p WHERE NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p.user_id)),
   'assigned_admin_roles',(SELECT count(*) FROM public.user_roles WHERE role='admin')),
 'financial_gates',(SELECT jsonb_build_object('settings_records',count(*),
   'money_locked',bool_and(NOT money_rules_approved),'referrals_locked',bool_and(NOT referral_rules_approved),
   'bank_details_unconfigured',bool_and(company_account_number IS NULL),
   'verification_bonus_disabled',bool_and(verification_bonus_policy IS NULL)) FROM public.platform_settings),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',co.conname,'kind',co.contype,
   'validated',co.convalidated) ORDER BY c.relname,co.conname)
   FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
 'public_view_columns',(SELECT jsonb_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='public_profiles'),
 'column_grants',(SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'privilege',privilege_type)
   ORDER BY table_name,column_name,privilege_type) FROM information_schema.column_privileges
   WHERE table_schema='public' AND grantee='authenticated')
) AS audit;
COMMIT;
