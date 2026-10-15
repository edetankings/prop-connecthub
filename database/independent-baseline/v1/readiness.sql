-- READ ONLY. Run in the NEW project's SQL Editor after checking its dashboard identity.
BEGIN READ ONLY;
SELECT current_user,current_setting('server_version') AS postgres_version;
SELECT count(*) AS existing_auth_accounts FROM auth.users;
SELECT count(*) AS existing_auth_identities FROM auth.identities;
SELECT extname,extversion FROM pg_extension ORDER BY extname;
SELECT n.nspname,c.relname,c.relkind,c.relrowsecurity,c.reloptions
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname IN ('public','prop_connect_private') AND c.relkind IN ('r','p','v','m','S')
ORDER BY n.nspname,c.relname;
SELECT t.typname,e.enumlabel,e.enumsortorder FROM pg_type t
JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid
WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder;
SELECT t.typname,t.typtype FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname='public' AND t.typtype IN ('e','d') ORDER BY t.typname;
SELECT p.oid::regprocedure AS signature,p.prosecdef FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','prop_connect_private') ORDER BY signature::text;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname IN ('public','storage') ORDER BY schemaname,tablename,policyname;
SELECT n.nspname,c.relname,t.tgname,t.tgenabled,p.oid::regprocedure AS function_signature
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND n.nspname IN ('auth','public');
SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id;
SELECT pubname,schemaname,tablename FROM pg_publication_tables ORDER BY pubname,schemaname,tablename;
SELECT to_regclass('supabase_migrations.schema_migrations') AS supabase_history,
 to_regclass('drizzle.__drizzle_migrations') AS drizzle_history,
 to_regclass('public.__drizzle_migrations') AS alternate_drizzle_history,
 to_regclass('prop_connect_private.installation_history') AS baseline_history;
SELECT n.nspname,c.relname AS possible_migration_ledger FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND c.relname ILIKE '%migration%' AND n.nspname NOT IN ('auth','storage','pg_catalog');
SELECT grantee,table_schema,table_name,privilege_type FROM information_schema.table_privileges
WHERE table_schema='public' ORDER BY table_name,grantee,privilege_type;
ROLLBACK;
-- If a history table exists, separately inspect version/hash/time columns only.
-- Do not run CLI commands that might initialize or repair migration ledgers.
