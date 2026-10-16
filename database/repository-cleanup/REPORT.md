# Repository cleanup report

Date: 2026-10-16. Independent backend: prtrpywkwmnpowrthppg.

## Local recovery checkpoint

Created .git/cleanup-checkpoints/20261016T095551Z before cleanup: pre-cleanup worktree ZIP (337 files), binary worktree/index patches, HEAD/status manifest and index backup. No commit, stash, stage or push. Ignored local environment files are excluded and remain untouched. RESTORE.txt explains selective recovery; do not overwrite newer unrelated edits or restore retired files blindly.

## Classification and changes

| Classification | Finding and action |
| --- | --- |
| SAFE TO REMOVE | 37 files verified unused by import/export/dynamic-import graph rooted at main.tsx, tests, setup and ambient declarations; supplemented by route/config/script/text searches. No unresolved local imports or dynamic file-loader/glob mechanism was found. Individual files removed; no directory-wide deletion. |
| SAFE TO REMOVE | 24 direct packages with no remaining imports/config/runtime consumers removed using npm uninstall. No major upgrade requested; retained package versions/resolution/integrity unchanged. |
| SAFE TO REMOVE | Unused mock fixtures/types/statistics removed; unchanged formatPrice/getTrustBadge implementations moved to src/lib/presentation.ts, with three consumer imports updated. Uncalled CinematicCard implementation/imports removed from Index. |
| SAFE TO REMOVE | Old project label removed from supabase/config.toml; project_id is now the neutral local-stack identifier prop-connect, not an implicit remote project link. |
| SAFE TO REMOVE / REPLACEMENT PROVIDED | LOVABLE_DB_MIGRATION_URL removed from active Drizzle configuration. Historical tooling now requires explicit PROP_CONNECT_LEGACY_DATABASE_URL and fails closed when absent; its empty legacy schema must never target the independent project. No environment file was changed or Drizzle command executed. |
| REQUIRES REPLACEMENT | Existing prop-connecthub.lovable.app website fallback and generated canonical/sitemap/robots URLs retained: no approved independent website domain/cutover was supplied. Backend independence does not establish hosting independence. |
| KEEP — STILL REQUIRED | All 48 Supabase and seven Drizzle SQL migrations, Drizzle journal/schema, isolated installation baseline, generated database types, frontend Auth/connection, Edge Functions and safety locks. |
| KEEP — STILL REQUIRED | database/legacy-backend-inventory.json retains the retired project identifier for provenance/security regression scanning. Anonymous scanner reads this inventory instead of misusing local config.toml as historical evidence. |
| KEEP — STILL REQUIRED | Audit/security/migration reports, validation SQL, deployment/type generation/SEO scripts, all active buyer/agent/builder/admin routes and their dependencies, public icons/social image/placeholder/llms assets. No remote service changed. |
| UNCERTAIN — NEEDS OWNER APPROVAL | Final website domain, DNS/hosting retirement, deleting historical preparation/audit artifacts or offline generator, and roadmap retention. Preserved; no deployment/history pruning inferred. |

The CLI documents project_id as a local project identifier: [Supabase CLI configuration](https://supabase.com/docs/guides/local-development/cli/config). No remote CLI operation was performed.

## Removed files (complete)

- `src/App.css`
- `src/components/admin/AdminKYCReview.tsx`
- `src/components/NavLink.tsx`
- `src/components/PropertyCard.tsx`
- `src/hooks/use-mobile.tsx`
- `src/hooks/useVerificationSteps.ts`
- `src/pages/Admin.tsx`
- `src/assets/hero-bg.jpg`
- `src/test/example.test.ts`
- `src/components/ui/accordion.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/breadcrumb.tsx`
- `src/components/ui/calendar.tsx`
- `src/components/ui/carousel.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/menubar.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/pagination.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/radio-group.tsx`
- `src/components/ui/resizable.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/slider.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/toggle-group.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/use-toast.ts`
- `src/lib/mockData.ts`

## Removed direct dependencies (complete)

- `@hookform/resolvers`
- `@radix-ui/react-accordion`
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-aspect-ratio`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-context-menu`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-menubar`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-separator`
- `@radix-ui/react-slider`
- `@radix-ui/react-toggle`
- `@radix-ui/react-toggle-group`
- `@supabase/ssr`
- `cmdk`
- `embla-carousel-react`
- `input-otp`
- `react-day-picker`
- `react-hook-form`
- `react-resizable-panels`
- `vaul`
- `zod`

Npm remains the validated package manager. No bun.lock or bun.lockb existed, so no binary lockfile was edited. lovable-tagger was already absent from package.json/package-lock.json and Vite before this cleanup; no Lovable package uninstall was necessary. Some removed direct packages can remain legitimately as transitive dependencies of retained packages. Supported npm tooling, not hand-edited lockfile entries, determines their retention.

## Remaining Lovable / old-backend references

- Active frontend source, Supabase Edge Function source, Vite plugins and npm manifest/lock contain no Lovable/gptengineer references. The frontend still obtains its independent URL/public key from environment variables; no secret was hardcoded.
- config/site-url.mjs and generated public/sitemap.xml/public/robots.txt retain the existing website hostname. No production URL or deployment setting was changed. Approve a real independent domain and cutover plan before removing these hosting references.
- The retired backend identifier remains only in the security inventory and historical Git/checkpoint evidence, not an active cloud connection. Audit detector strings and historical documentation remain intentionally; they do not contact Lovable.
- Historical migration/security records preserve necessary provenance. Prepared AI/OTP Edge Functions require separately reviewed provider/configuration and deployment; no hardcoded Lovable AI gateway remains in their source. No new provider, function or payment workflow was enabled.

## Environment and Git safety

.env.local is ignored and untracked; .env.example retains safe public placeholders only. Ignore rules additionally protect private key/certificate bundles. No currently tracked environment/key bundle was found, and Git remote URLs contain no embedded HTTP credentials. Existing ignored CLI metadata was not changed; no project-ref link file was present.

A targeted historical scan found two committed .env versions containing public Supabase configuration/public-key material, with no detected password, service-role, server-secret or access-token fields. This is not an exhaustive proof that every Git object is secret-free. Public publishable/anon keys are browser configuration, not privileged secrets. If a privileged credential exposure is independently identified, rotate it privately and arrange separately approved history remediation. No history rewrite or credential rotation occurred.

## Before/after validation

| Check | Before | After |
| --- | --- | --- |
| Application/build-config TypeScript | PASS | PASS (both projects) |
| Unit tests | First run: 63 passed, one upload-test 5-second timeout under parallel validation. Unchanged isolated rerun: all four upload tests passed | PASS: 63 tests / 13 files; single worker and no file parallelism, unchanged test timeouts |
| Production build | PASS; existing Browserslist/CSS-import-order/large-chunk warnings | PASS; same warning categories |
| Repository ESLint | 375 errors, 37 warnings | FAIL: 361 errors, 31 warnings; zero new diagnostics compared with baseline |
| Dependency/reference checks | Import graph and root/config/deployment inventory reviewed | PASS: no unresolved local imports, unreachable source files/assets or active Lovable package references; npm ls exit 0 with no dependency problems |
| Supabase destination | Previously verified independent configuration | PASS: both restored local servers (8080/8081) serve the independent project URL and matching local publishable key; local checks only |
| Protected history/backend files | 95 SHA-256 baselines recorded | PASS: all 95 unchanged, including local environment, baseline, all 55 historical migrations, Auth client/types and Edge source |

The one trivial expect(true).toBe(true) starter test was removed; all 63 remaining tests executed and passed. No feature/security test was removed or relaxed, and timeout settings were not increased. No lint rule or TypeScript option was weakened. Owner-reported manual success remains evidence of exercised functionality, not a newly executed authenticated test.

Fresh npm ci initially failed because two existing workspace Vite servers held the Windows esbuild executable. Only verified workspace Vite processes/children were stopped for reinstall; A fresh npm ci then succeeded (598 installed packages). Both pre-existing server ports (8080 and 8081) were restored sequentially after checks and each returned HTTP 200 with the correct independent configuration. Startup probes initially timed out/refused while servers were starting; final checks passed. No unrelated system processes/settings were changed.

Evidence: changes.json, reference-results.json, integrity-results.json, environment-audit.json, lint-comparison.json, connection-results.json and validation-results.json in this directory. Final git diff --check passed (Git emitted existing line-ending notices). Runtime Auth acceptance was not performed; existing owner-reported manual success is preserved.

## Review and independent deployment prerequisites

Do not declare complete Lovable hosting removal or production readiness while the website-domain decision and authenticated acceptance remain open. Before independent deployment: approve the domain and hosting/SPA routing, review Auth redirect/CORS settings without changing them here, complete the already-approved A1 browser checklist and separately approve A2/other fixtures, review prepared Edge Functions/providers and deploy only with explicit authorization, retain financial locks and resolve existing lint debt.

No database writes, migration execution, Auth/user changes, storage/policy changes, administrator assignment, financial activation, Edge deployment, production setting change, Lovable Cloud deletion, commit or push was performed. Unrelated worktree changes remain intact. Stop for owner review after local checks.
