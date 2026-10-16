BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
SELECT current_setting('transaction_read_only') AS read_only,
 c.relrowsecurity AS storage_objects_rls,
 (SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects') AS storage_policy_count,
 has_table_privilege('anon',c.oid,'SELECT') AS anon_table_select,
 has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_table_select,
 has_table_privilege('authenticated',c.oid,'INSERT') AS authenticated_table_insert
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='storage' AND c.relname='objects';
COMMIT;
