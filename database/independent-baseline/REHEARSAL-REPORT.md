# Phase 3D installation rehearsal

Date: 2026-10-15. Status: **BLOCKED before runtime installation**.

No database connection was opened and no SQL was executed. Production Supabase and Lovable Cloud were not accessed. The baseline is not yet cleared for production installation.

## Results

| Check | Result |
| --- | --- |
| README, installer and ten ordered SQL files | Inspected; offline parser verification passed |
| Installation order | Explicit 00 through 09 includes, inside one transaction, with ON_ERROR_STOP and approval gate |
| Historical migrations and Drizzle journal | SHA-256 preservation checks passed |
| Offline assertions | 693 passed |
| Parsed SQL | 561 statements; 58 PL/pgSQL bodies and 11 SQL function bodies |
| Installation | Not attempted: disposable environment unavailable |
| Runtime objects installed | 0 |
| validation.sql | Parsed offline; not executed |
| Auth signup/profile creation and login | Not executed |
| Property approval and role escalation restrictions | Not executed |
| Referral distribution and duplicate-payment protection | Not executed |
| Messaging, reservations and financial safeguards | Not executed |
| Storage authorization and Realtime delivery | Not executed |
| Runtime SQL errors/corrections | No runtime evidence available; no SQL corrections made |

Expected inventory, **not an installed inventory**: 30 public application tables, two private infrastructure tables, six enums, 69 functions, 40 triggers, 110 policies, one public directory view, two public sequences, six buckets (four private), and three application members of the existing Realtime publication. Grants and constraints still require database-level inspection and actor-based tests.

## Environment blocker

Docker, Supabase CLI, PostgreSQL server/client tools and Podman were not found on PATH. Standard Docker Desktop, PostgreSQL and repository-local Supabase CLI locations were absent; no Docker/PostgreSQL services were returned. WSL's executable exists, but the distribution listing returned usage text rather than an available distribution. No usable local Supabase environment was established. Node v22.23.2 is available.

A plain PostgreSQL server is insufficient for a faithful rehearsal: preflight requires PostgreSQL 15+, initialized Supabase Auth and Storage, API roles, the Supabase Realtime publication, no Auth users, and no existing application objects or storage configuration. The installer also refuses any existing Supabase/Drizzle migration ledger, even an empty one. A CLI-created stack may have such a ledger; inspect it and report the conflict before making a narrowly justified baseline correction. Do not delete managed metadata or bypass preflight merely to make installation pass.

## Set up the disposable environment

1. Install and start Docker Desktop with its supported Windows/WSL2 configuration, and install a PostgreSQL 15+ `psql` client. Confirm `docker info` succeeds.
2. Create a new scratch directory outside this repository. Initialize a separate local Supabase workspace there using `npx supabase init`, then `npx supabase start`. Use a unique local project ID and free ports. Record the CLI version for reproducibility. Never copy this repository's Supabase configuration, migrations, credentials or `.env` into it; never link it to a hosted project.
3. Inspect the local endpoints privately using `npx supabase status`. Do not save or paste secret-bearing status output into the report. Confirm the database host is loopback, and verify the container/project identity. Set up a local-only password prompt or local credential file; never reuse hosted credentials.
4. Use explicit local connection parameters with `psql -X` and the database port reported by the disposable stack. Do not use a production service alias, connection URL, `supabase db push`, `db reset`, or `--linked`.

Official setup references: [Supabase CLI prerequisites](https://supabase.com/docs/guides/local-development/cli/getting-started), [local development](https://supabase.com/docs/guides/local-development), and [isolating local projects](https://supabase.com/docs/guides/local-development/running-multiple-local-projects). Node 20+ is required for npm/npx CLI execution.

## Resume rehearsal

After the local endpoint and prerequisites are verified, use the following PowerShell template. Replace the port with the verified disposable port; the commands below have **not** been executed. They explicitly target loopback. Supply only the disposable database password when prompted.

```powershell
$rehearsalPort = Read-Host 'Verified disposable local database port'
$baselinePath = 'C:/Users/edetan/Desktop/prop-connecthub/database/independent-baseline/v1'
psql -X -h 127.0.0.1 -p $rehearsalPort -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$baselinePath/readiness.sql"
# Review readiness output and resolve any preflight conflicts before continuing.
psql -X -h 127.0.0.1 -p $rehearsalPort -U postgres -d postgres -v ON_ERROR_STOP=1 -v PROP_CONNECT_INSTALL_APPROVED=1 -f "$baselinePath/install.psql"
# Stop if the process exit code is nonzero. Do not run historical migrations.
psql -X -h 127.0.0.1 -p $rehearsalPort -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$baselinePath/validation.sql"
```

Run commands separately and check each exit code. Validation queries include boolean results and inventory listings: successful SQL execution alone is not a passing validation. Require every boolean check to be true, reconcile catalog objects against `v1/expected-objects.json`, and inspect grants, foreign keys, private buckets and publication membership.

Then execute `v1/REGRESSION-PLAN.md` against disposable fixtures using anonymous, ordinary-user, unrelated-user, agent and administrator identities. Test real local Auth signup/login and Storage/Realtime APIs in addition to SQL actor tests. Cover profile creation, malicious signup metadata, self-assigned roles/KYC/property approval, unrelated reads/writes, financial gate rejection, payment/reference idempotency, conservation, insufficient funds, refunds, referral placement/distribution, messaging restrictions and reservation transitions. Use transaction rollback for SQL fixtures where feasible. Fixture-only financial configuration does not constitute approval of production business rules.

Capture exact versions, commands, exit codes, validation results, observed runtime errors and workflow assertions. If corrections are needed, modify only baseline artifacts, refresh their package checksums, rerun offline verification, and repeat installation in a newly disposable stack. Preserve all historical migrations.

## Changes and release decision

This phase added this report and reran the existing derived offline verification report. No baseline SQL, historical migrations, credentials, frontend connection or Edge Functions were changed. Existing package.json and package-lock.json worktree changes were preserved.

Production readiness remains **unproven** until installation, catalog validation and runtime regression tests actually pass. Owner decisions documented in `v1/CORRECTIONS.md` and `v1/README.md`, including monetary units, referral policy, bonus funding, held earnings, renewals and payment configuration, remain separate activation gates. Do not install in the main Supabase project as part of this rehearsal.
