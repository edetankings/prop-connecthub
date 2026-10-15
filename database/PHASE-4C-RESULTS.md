# Phase 4C: live Supabase TypeScript types

Date: 2026-10-15. Result: **live type generation and local compatibility validation
completed** against owner-confirmed independent project `prtrpywkwmnpowrthppg`.
No remote database resources were modified.

## CLI diagnosis and authentication

The available terminal is PowerShell 7.6.7 on Windows. Node 22.23.2 and npm/npx
12.0.2 are available. The original bare `supabase --version` failed because no
Supabase executable was on PATH and no project-local CLI installation existed.
The supported `npx --yes supabase --version` execution succeeded with CLI 2.121.0
during diagnosis. No global npm installation or system PATH changes were made.

The existing script already invokes the CLI through npx and needed no invocation
change. Its nonzero-exit handling, temporary-file generation, baseline marker
checks and overwrite-after-success behavior were preserved.

An initial authentication check required login. The owner completed official CLI
login privately, then reconfirmed the independent project. The following prepared
script subsequently succeeded using that authenticated CLI session:

```powershell
./scripts/generate-supabase-types.ps1 -ProjectRef prtrpywkwmnpowrthppg
```

It invoked read-only hosted generation with:

```text
npx --yes supabase gen types typescript --project-id prtrpywkwmnpowrthppg --schema public
```

The target was explicitly supplied, not inferred from the old config.toml or CLI
link metadata. No project link/switch command was run. No passwords, tokens, API
keys or other credentials were printed or saved in source files. Local CLI
temporary metadata is now ignored through `supabase/.temp/`; existing contents
were left intact.

## Schema comparison

The generated TypeScript contract was parsed with the TypeScript compiler API and
compared offline with the baseline SQL parsed using pglast. The comparison covers
all public table columns, row types/nullability, required/defaulted insert fields,
enum labels/order, public non-trigger function arguments/defaults/return shapes,
the public-directory projection and public-schema FK relationship metadata.

| Object | Baseline expected | Live types | Differences |
| --- | ---: | ---: | ---: |
| Public application tables | 30 | 30 | 0 |
| Enums | 6 | 6 | 0 |
| Public directory view | 1 | 1 | 0 |
| Public non-trigger functions | 37 | 37 | 0 |
| Public-schema FK relationships | 31 | 31 | 0 |

No missing or extra objects, mismatched columns, enum labels, RPC signatures or
public FK relationships were found within this comparison scope. All 37 function
return signatures were checked. Details and the generated file hash are recorded
in `PHASE-4C-SCHEMA-COMPARISON.json`.

Differences from the earlier offline **typing**, rather than schema drift:

- Standard generated client metadata identifies PostgREST **14.18**.
- `deal_requests.transaction_id` is correctly marked one-to-one because the
  baseline adds a UNIQUE constraint through ALTER TABLE. The offline generator
  did not account for that later cardinality change. The subscription activation
  request relationship is also represented as one-to-one.
- CLI-standard function return annotations replace conservative nullable offline
  annotations, and standard generated helpers/formatting replace the offline file.
  Such annotations do not prove runtime results can never contain NULL.

The baseline's 69 total functions include private and trigger-only functions;
those are outside the public non-trigger API type inventory. Their omission from
public types is not evidence of missing installation objects. Similarly, the
31 relationships above exclude Auth-target FKs, which are outside the selected
public schema's relationship metadata.

Type generation does **not** prove private infrastructure, Auth FK integrity,
function bodies, grants, RLS policies, triggers, check/index enforcement, Storage,
Realtime or business workflows. No additional remote SQL inspection or workflow
tests were executed in this phase. Owner-reported registration, confirmation and
profile creation are separate evidence, not tests performed by these local checks.

## Validation results

| Check | Result |
| --- | --- |
| Generation script | Passed; existing identity/generation checks passed before overwrite |
| Application TypeScript: `tsc --noEmit -p tsconfig.app.json` | Passed |
| Build configuration TypeScript: `tsc --noEmit -p tsconfig.node.json` | Passed |
| Unit tests: `npm test -- --maxWorkers=1 --no-file-parallelism` | Passed: 37 tests, eight files |
| Production build: `npm run build` | Passed |
| Frontend literal-query audit | 253 references, zero basic contract errors; 40 manual follow-ups remain |
| ESLint: `npm run lint` | Failed: 386 errors, 37 warnings |
| Whitespace diff check | Passed |

No application source fixes, weakened TypeScript settings, lint-rule suppression
or package changes were needed to accommodate the live-generated types. The unit
tests use mocked backend dependencies; they do not establish live RLS, Storage or
Edge Function correctness.

Lint totals are unchanged from Phase 4. Errors comprise 378 explicit-any findings,
three unnecessary escapes, two empty-object types, two require-import findings and
one unused expression. Existing React Router future-flag warnings remain in tests.
Build warnings remain for stale Browserslist data, CSS @import ordering and a large
JavaScript chunk. These issues were reported without disabling checks.

## Files changed in Phase 4C

- `src/integrations/supabase/types.ts`: replaced the offline contract with official
  live-generated public schema types; no manual edits to generated contents.
- `.gitignore`: added the local Supabase CLI temporary metadata directory.
- `README.md`: current local configuration and live-type provenance.
- `database/PHASE-4-INTEGRATION.md`: current generation procedure and a warning
  against overwriting live types with the old offline generator.
- `database/PHASE-4C-SCHEMA-COMPARISON.json`: public contract comparison evidence.
- `database/PHASE-4C-RESULTS.md`: this report.

Existing worktree changes, including the pre-existing `.env` deletion and earlier
integration/baseline edits, were preserved. No baseline SQL, migration history,
environment values, credentials or generation-script safety checks were changed.
Build-generated SEO output retained the same configured website origin/routes.

## Remaining blockers and next step

Live type generation is no longer a blocker. Continue controlled functional and
authorization tests against the independent backend, especially the 40 embedded
relationship/dynamic query follow-ups, denied cross-user actions, private-file
access, Realtime delivery and failure handling. Administrator bootstrap remains
postponed. Financial decisions/locks and provider/deployment approvals remain
unchanged. Repository lint debt still needs resolution before release.

No migrations, resets, database updates, Edge deployments, administrator creation,
financial activation, production environment changes, commits or pushes occurred.
