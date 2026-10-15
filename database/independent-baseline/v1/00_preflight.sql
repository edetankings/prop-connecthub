-- Fail closed. No destination identity is inferred from the old repository config.
DO $$
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Install as destination postgres owner after verifying destination identity'; END IF;
 IF current_setting('server_version_num')::integer<150000 THEN RAISE EXCEPTION 'PostgreSQL 15 or newer required'; END IF;
 IF to_regprocedure('auth.uid()') IS NULL OR to_regclass('auth.users') IS NULL
   OR to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
   RAISE EXCEPTION 'Initialized Supabase Auth and Storage required'; END IF;
 IF to_regnamespace('prop_connect_private') IS NOT NULL THEN RAISE EXCEPTION 'Baseline namespace already exists; inspect, do not overwrite'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users) THEN RAISE EXCEPTION 'Existing Auth accounts require an explicit profile/bootstrap plan'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S')) THEN
   RAISE EXCEPTION 'Public relations exist; reconcile destination first'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public')
   OR EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('e','d')) THEN
   RAISE EXCEPTION 'Public functions or enums exist; reconcile destination first'; END IF;
 IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
   OR to_regclass('drizzle.__drizzle_migrations') IS NOT NULL
   OR to_regclass('public.__drizzle_migrations') IS NOT NULL THEN
   RAISE EXCEPTION 'Migration ledger exists, even if empty; inspect before adapting preflight'; END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets) OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage') THEN
   RAISE EXCEPTION 'Existing storage configuration requires reconciliation'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=p.pronamespace
   WHERE n.nspname='auth' AND NOT t.tgisinternal AND fn.nspname NOT IN ('auth','storage','extensions')) THEN
   RAISE EXCEPTION 'Custom Auth integration already exists'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables)
   OR EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public') THEN
   RAISE EXCEPTION 'Unexpected Realtime publication configuration'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) AS expected(name)
   WHERE NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=expected.name)) THEN RAISE EXCEPTION 'Supabase API roles missing'; END IF;
END $$;
CREATE SCHEMA prop_connect_private;
REVOKE ALL ON SCHEMA prop_connect_private FROM PUBLIC;
CREATE TABLE prop_connect_private.installation_history(
 revision text PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now(),
 source_history_sha256 text NOT NULL, notes text NOT NULL);
REVOKE ALL ON prop_connect_private.installation_history FROM PUBLIC,anon,authenticated,service_role;
-- Cross-workflow external reference uniqueness; no receipt rows are seeded.
CREATE TABLE prop_connect_private.payment_receipts(
 reference text PRIMARY KEY CHECK(reference=btrim(reference) AND length(reference)>0),
 purpose text NOT NULL CHECK(purpose IN ('listing_payment','subscription','withdrawal')),
 record_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(purpose,record_id));
REVOKE ALL ON prop_connect_private.payment_receipts FROM PUBLIC,anon,authenticated,service_role;
