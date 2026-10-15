# PROP-CONNECT independent database baseline v1

Status: preparation artifact, not installed. No source or destination database
has been contacted. Table Editor emptiness does not establish destination readiness.

This package installs a fresh schema and configuration, not Lovable testing
accounts, records, files, Auth credentials, or balances. Historical migrations
and the Drizzle journal remain unchanged. No frontend, environment, Edge Function,
or hosting configuration is changed by preparing these files.

## Package contents

| File | Purpose |
| --- | --- |
| `install-sql-editor.sql` | Plain SQL Editor entry point; all ten sources embedded unchanged in one transaction |
| `build-sql-editor.py` | Deterministic offline generator using the installer allowlist |
| `install.psql` | Explicitly gated, atomic psql entry point; includes only ten local files |
| `00_preflight.sql` | Refuses unexpected destination state; creates private installation/receipt infrastructure |
| `01_schema.sql` | Six final enums, all 30 public tables and historical columns, two sequences |
| `02_relationships.sql` | Explicit identity domains, foreign keys, indexes, uniqueness and financial checks |
| `03_identity.sql` | Signup, roles, referral placement, bounded directory, settings and aggregate helpers |
| `04_guards.sql` | Protected fields, immutable identities, moderation, consolidated notifications |
| `05_finance.sql` | Checked payment, withdrawal and gated subscription/referral workflows |
| `06_workflows.sql` | Property/deal numbering, deals, inspections and scoped participant lookups |
| `07_security.sql` | RLS and explicit table, column, sequence and function permissions |
| `08_integrations.sql` | Canonical triggers, six buckets, Storage policies, Realtime membership |
| `09_seed.sql` | Three configuration records and one private baseline-history record |
| `historical-manifest.json` | Every historical file's hash, disposition and destination mapping; journal hash |
| `expected-objects.json` | Machine-readable table/column, enum, function, policy and trigger inventory |
| `readiness.sql` | Read-only destination discovery, before installation |
| `validation.sql` | Read-only structural/security inspection immediately after installation |
| `CORRECTIONS.md` | Functional/security decisions and compatibility changes |
| `REGRESSION-PLAN.md` | Required later runtime and authorization scenarios |
| `verify.py`, `offline-verification.json` | Repeatable offline parsing/source checks and their recorded result |
| `package-checksums.json` | Checksums for the versioned SQL/entry-point artifact |

## Isolation and migration history

The psql entry point uses literal `\ir` paths in this directory only. It never scans
`supabase/migrations/` or `drizzle/migrations/` and is not wired into npm scripts,
CI, deployment, Supabase CLI linking, or Drizzle tooling. Do not run `supabase db
push` or Drizzle migrations alongside this baseline. Do not paste the historical
55 files into the SQL Editor.

The baseline has its own `prop_connect_private.installation_history`. It does
not claim that the historical files were executed. Keep their source files,
snapshots, journal and Git history as provenance. Future changes need one
explicitly chosen migration lineage targeting this baseline; configuring that
runner is a separate task. Do not repair source/destination migration ledgers to
hide an installation mismatch.

There are 30 application tables in `public` and two non-API infrastructure tables
in `prop_connect_private`: installation history and unique external payment
references. The latter starts empty. Keep this private schema out of the Data
API exposed-schema list. Narrow helper EXECUTE/USAGE grants support RLS and the
public view; other private objects have no client grants.

## Required owner decisions

Financial operations start locked: `money_rules_approved=false`,
`referral_rules_approved=false`, monetary units and bank fields are NULL.
No placeholder bank account is usable. These flags are not a substitute for
reviewing the implementation and completing a rehearsal.

1. **Monetary units and commission incidence.** The implemented historical
   candidate uses integer NGN major units. Listing price includes commission,
   which is deducted from the seller payout; the buyer pays the listing price.
   Commission defaults are provisional 1% sale, 5% rental and 5000 reservation
   value. NGN minor units require a reviewed conversion patch before activation.
   Reservation payment collection is not implemented merely because a setting exists.
2. **Subscription allocation.** The preserved candidate is 7500: 2500 company,
   1000 direct and 4000 across 15 matrix levels. Direct and first matrix earnings
   are distinct events even for the same beneficiary. The candidate's direct
   recipient is the placement parent, matching the historical distribution code,
   not necessarily the original inviter. Confirm this explicitly or revise it.
   Enabling requires `referral_policy='legacy-15-level-v1'`, amount 7500,
   NGN_MAJOR and both approval flags. No values are enabled by the seed.
3. **Verification referral bonus.** The old 1000 bonus has no clearly defined
   funding/reversal policy. It is disabled with `verification_bonus_policy=NULL`.
   Setting a non-NULL policy raises an explicit error: a funded implementation
   and regression tests must be approved first. No bonus is minted or silently
   withdrawn from a company account.
4. **Escrow holds.** Historical 30-day hold metadata is retained. Automatic
   release, forfeiture and reactivation catch-up are not implemented without an
   approved policy. Held allocations remain held. No scheduled job is installed.
5. **Renewals.** Expired subscriptions can receive a new approved activation
   request/version. Renewal while an existing paid period is active is rejected
   pending a carry-over/proration policy. The administrator supplies the approved
   explicit end date; no billing duration is invented.
6. **Refunds.** Pre-release secured payments can be reversed only after admin
   attestation of the external refund. Post-release recovery is rejected until
   an approved policy addresses withdrawn seller funds, commissions and disputes.
   A dispute-resolution label cannot itself move money.
7. **Administration and account deletion.** No administrator is seeded. Bootstrap
   a real account and role later through a separately approved owner process.
   Financial foreign keys intentionally restrict destructive deletion. Review
   account retention/soft deletion before deploying `admin-delete-user`.
8. **Messaging, public metadata and storage.** Confirm public aggregate financial
   metrics, publication eligibility, restricted-chat activation, contact-filter
   false-positive handling, MIME requirements, upload quotas, malware scanning,
   retention and document-sharing requirements. File sizes inherit the destination
   global limit; the SQL does not invent bucket-specific quotas.

These unresolved decisions do not require exposure of secrets. Do not enable
financial flags until the relevant decisions and compatibility work are complete.

## Safe installation procedure — after explicit approval only

1. Confirm the destination project in its own Supabase dashboard. Do not infer
   its identity from the checked-in configuration, which still points at the
   original backend. No credentials or project identifiers belong in these files.
2. Run **only `readiness.sql`** in that new project's SQL Editor. Review tables,
   views, functions, enums, policies, custom Auth triggers, buckets, Realtime,
   privileges and migration-ledger presence. If any ledger exists, inspect its
   version/hash/time columns separately. Check exposed API schemas and Auth settings
   in the dashboard as well. Never share keys, connection strings or record dumps.
3. Review the manifest, corrections, business decisions and package checksums.
   Re-run `verify.py`. Retain an independently stored destination backup if the
   metadata check finds anything worth preserving.
4. Phase 3E owner decision: the separate local rehearsal is explicitly skipped.
   Runtime installation and security behavior remain unverified. The Phase 3D
   report records that rehearsal was blocked, not passed. This preparation does
   not authorize execution against the destination.
5. After separately authorizing installation, use either `install.psql` with
   psql 15+ or the SQL Editor procedure below. Do not run both. Both preserve
   the same preflight and single atomic transaction. The plain SQL artifact
   has no psql approval-variable prompt: clicking Run authorizes execution.
   Preflight refuses any existing public relations/functions/enums, Auth users,
   baseline namespace, migration ledger (even empty), buckets/storage policies,
   custom Auth integration or unexpected publication state. Managed Auth,
   Storage, API roles and PostgreSQL 15+ must already exist. Table Editor
   emptiness alone is insufficient. Never remove a guard to force installation.
6. Run `validation.sql`. Review every false result and object inventory difference.
   Baseline column/permission checks do not replace token-level regression tests.
7. Complete frontend/Edge compatibility work and Auth configuration separately.
   Recreate the first administrator only after approval. Never allow signup
   metadata or a browser to bootstrap an admin role.
8. Resolve business decisions, configure real bank details securely, and test
   financial activation on disposable data before opening traffic. This package
   neither connects the frontend nor deploys Edge Functions.

## Offline verification

Use a local Python environment with `pglast==8.6`. The parser does not connect to
PostgreSQL or Supabase. It parses SQL, SQL-language bodies and PL/pgSQL bodies,
checks historical hashes, table/column coverage, function names, RLS declarations,
installer isolation and protected bucket configuration.

```sh
python database/independent-baseline/v1/verify.py --report database/independent-baseline/v1/offline-verification.json
```

If installed in a temporary directory rather than Python's default environment,
pass `--parser-path <directory>`. Do not add the parser to application dependencies.
Review `offline-verification.json` for actual checks performed. Parsing cannot
validate live privileges, relation/function resolution, trigger behavior,
concurrency, Storage routing or PostgREST compatibility. These remain unverified when rehearsal is skipped.

## Reference documentation

- [Supabase RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase view security](https://supabase.com/docs/guides/database/views)
- [Storage access models](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Migration history](https://supabase.com/docs/guides/deployment/database-migrations)
- [PostgreSQL policy composition](https://www.postgresql.org/docs/current/sql-createpolicy.html)

## Supabase Dashboard SQL Editor procedure

This artifact is prepared, not installed. No database connection or SQL execution
was performed during preparation. The numbered source files are unchanged.

1. Open the **new independent project**, verify its name/reference in the
   dashboard, then open SQL Editor. Use the `postgres` execution role, not an
   authenticated-user impersonation. The preflight enforces `current_user`.
2. In a separate query, paste and run the complete `readiness.sql`. Review all
   results, including managed integration prerequisites and ledger presence.
   Stop for unexpected state; do not delete objects or managed migration ledgers.
3. Review owner decisions and compatibility changes. Retain a backup of anything
   worth preserving. Re-run offline verification and check the artifact checksum.
4. Open a new SQL Editor query and paste **all** of `install-sql-editor.sql`,
   including BEGIN, both local timeouts, all ten marked sections, and COMMIT.
   Clear any text selection so Run executes the entire query. Do not split it,
   run individual highlighted statements, or paste `install.psql` instead.
5. Only when installation is explicitly authorized, click Run once. All present
   top-level statements are compatible with a PostgreSQL transaction: ordinary
   DDL, functions/DO blocks, grants, policies, configuration inserts and publication
   membership changes. There are no concurrent indexes or database creation.
   Locks have a 5-second timeout; statements have a 120-second timeout. Dashboard
   limits can be stricter and are not overridden by these settings.
6. On any error or ambiguous timeout, stop. Do not retry a subset or assume a
   reported timeout means no commit occurred. If the session reports an aborted
   transaction, run `ROLLBACK;` separately to clear it. Inspect readiness and the
   private installation ledger before deciding whether a fresh full attempt is
   appropriate. An error inside the transaction prevents partial installation;
   connection loss after COMMIT can leave the result uncertain until inspected.
7. After confirmed success, run all of `validation.sql` separately. Require each
   boolean result to be true and reconcile inventory with `expected-objects.json`.
   A successful SQL response alone does not prove validation passed. Then perform
   the authorization and workflow tests in `REGRESSION-PLAN.md` before opening
   traffic or enabling financial operations. Never use live payment funds for tests.
8. Administrator creation, Auth provider/redirect setup, frontend cutover and Edge
   Function deployment remain separate tasks. No admin is seeded; financial locks,
   NULL bank configuration and owner-decision gates remain intact.

The SQL Editor artifact embeds only the ten numbered files; it cannot discover
or execute the 55 historical migrations. It is intentionally one-time installation,
not idempotent repair SQL. No statement-level SQL Editor blocker was identified
in offline review; destination privileges and managed-service compatibility still
require runtime confirmation.

Regenerate locally with `python database/independent-baseline/v1/build-sql-editor.py`.
Refresh package checksums after reviewed artifact changes, then run `verify.py`.
Verification compares every embedded section to its source and compares the whole
parsed SQL sequence to the numbered baseline plus the transaction/timeouts.

Reference: [Supabase SQL Editor execution role](https://supabase.com/docs/guides/troubleshooting/tracking-postgres-role-activity-to-specific-dashboard-users-8d3715).
