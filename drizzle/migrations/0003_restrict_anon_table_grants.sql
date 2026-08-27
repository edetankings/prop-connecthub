-- Anonymous visitors must never hold write privileges on any table.
-- RLS already blocks them; this removes the privilege layer too (defense in depth),
-- so a future mis-written policy cannot become a data breach on its own.
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN
    SELECT c.oid::regclass AS tbl
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE %s FROM anon', t.tbl);
  END LOOP;
END $$;

-- Anonymous reads: only the genuinely public surface of the marketplace.
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN
    SELECT c.oid::regclass AS tbl, c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname NOT IN ('properties', 'profiles', 'announcements', 'ratings')
  LOOP
    EXECUTE format('REVOKE SELECT ON TABLE %s FROM anon', t.tbl);
  END LOOP;
END $$;

GRANT SELECT ON TABLE public.properties TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT SELECT ON TABLE public.announcements TO anon, authenticated;
GRANT SELECT ON TABLE public.ratings TO anon, authenticated;

-- Service role keeps full access for edge functions / admin jobs.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Sequences: anonymous callers no longer need them (they cannot insert).
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- New objects should not be world-accessible by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;