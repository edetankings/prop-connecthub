# Phase 5 reusable harness and execution procedure

This harness does not obtain or simulate an application-user session. It does not accept access tokens, service-role keys, passwords or browser-storage exports. Browser-driven actor tests remain manual/controlled until a connected browser and the approvals in OWNER-APPROVALS.md are available.

## Safe existing checks

Run from the repository root in PowerShell:

```powershell
node scripts/phase5-readonly-checks.mjs
node scripts/phase5-readonly-checks.mjs --catalog
node scripts/phase4d-anonymous-checks.mjs database/phase-5/anonymous-results.json
npx --no-install tsc --noEmit -p tsconfig.app.json
npx --no-install tsc --noEmit -p tsconfig.node.json
npm test -- --maxWorkers=1 --no-file-parallelism
npm run build
npx --no-install eslint scripts/phase4d-anonymous-checks.mjs scripts/phase5-readonly-checks.mjs
```

The first command verifies the exact independent HTTPS origin and public-key prefix internally, checks the optional project ID, and compares the publicly served Vite client configuration at localhost:8080 in memory. It prints booleans/statuses rather than configuration values. It does not inspect browser localStorage, cookies, session stores or hidden application state.

`--catalog` additionally invokes the authenticated Supabase CLI with **both** `--linked` (Management API mode) and explicit `--project-ref prtrpywkwmnpowrthppg`, after local destination verification. It never runs a link/switch command or infers a destination from the old supabase/config.toml. It executes only safety-readonly.sql, whose transaction is BEGIN READ ONLY. SQL reads catalogs and aggregate state, not private operational rows. CLI output is captured; raw errors are withheld. A blocked metadata check must be investigated rather than assumed successful. The command's exit code signals FAIL checks; inspect BLOCKED statuses too.

The anonymous script's optional output argument preserves earlier Phase 4D evidence. It performs only allowlisted GET requests using the local public publishable key. No ordinary user session, login, signing POST, upload, email, write RPC or database mutation is used. Empty public results cannot prove visibility controls for populated fixtures.

Reports go to database/phase-5/. Keys and operational record contents must never be added to these reports. CLI authentication remains distinct from application-user authorization.

## Reused mocked regression infrastructure

Vitest and React Testing Library exercise:

- Auth UUID/profile lookup, stale responses after logout, role/signup constraints and financial fail-closed behavior.
- ProtectedRoute/AdminRoute loading, unauthenticated and ordinary/admin mock contexts.
- Property image/video/document failure and retry; retained confirmed IDs and private document paths.
- Recovery event/session validation, invalid links, errors, loading, retry and duplicate submissions.
- Empty/error/not-found property results, no demo fallback, correct rental labels and availability metadata.
- Private signed-link rejection and chat upload failures without public fallback.

These tests perform no live application writes. Do not relabel them as live Auth/RLS/Storage/browser results. The existing 64-test suite is the regression baseline; it is not an end-to-end harness with independently authenticated live actors.

## Controlled actor execution after approval

1. Verify the served frontend target first. Use a browser connected through the supported browser skill; privately sign in with a suitable approved account. Never extract cookies, bearer tokens, localStorage, browser profiles or a CLI service session.
2. Read TEST-MATRIX.md. Use aliases A/B/C for independently authenticated identities and isolate their browser contexts. Do not convert roles or grant administrative privileges to obtain coverage.
3. Before visiting any route, check side effects: /chat/new can create a thread; existing /chat/:threadId can mark messages seen; dismissing the welcome dialog updates profiles.welcome_seen; login touches last_login; notification click/read actions update notifications. Only execute the approved subset.
4. For read-only cases, observe visible UI plus ordinary permitted application requests. Record only the case ID, alias, observed status/boolean/count and expected result. Mask personal information in any screenshot. No bearer URLs, authentication headers, passwords, full profile content or unredacted network captures in reports.
5. Require known positive fixtures before cross-user denials. Confirm B's fixture exists using B, then test A's denied access, and recheck B's unchanged fixture. Zero records with no known target are NOT proof of isolation.
6. Before each approved write, record the exact synthetic fixture alias, planned change and approved recovery procedure. For unexpected success, stop that category immediately. Do not fix remote policies, escalate privileges, activate gates or perform unapproved cleanup.
7. For Realtime, first observe successful subscriptions in permitted contexts, then one approved producer write and recipient delivery; verify the unrelated actor receives no private event. Publication membership alone is not delivery evidence. Opening a thread can itself mutate read state.
8. Update REPORT.md and the relevant matrix rows only after each case executes and its persisted/visible result is checked. Retain BLOCKED/NOT TESTED outcomes. Keep successful money operations and administrator bootstrap out of this phase.

No authenticated tests run automatically after these safe commands. Connecting a browser alone does not approve account changes, fixtures or uploads.
