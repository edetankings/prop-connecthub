# Phase 4D functional and security verification

Date: 2026-10-16. Verified destination: `prtrpywkwmnpowrthppg`.

**Status: read-only verification passed within the tested scope; complete functional/security acceptance is pending.** No connected browser or authorized application-user session was available. Catalog assertions and empty anonymous responses do not replace authenticated workflow tests.

## Executed checks

| Area | Result | Evidence and limits |
| --- | --- | --- |
| Served frontend configuration | PASS | Existing local Vite server serves the independent project URL and matching local publishable key. No credential values are included in reports. |
| Old backend/broker references | PASS | Source and existing built assets contain zero old backend API references; no active preview-auth broker reference was found. This is not a browser network trace. |
| Live catalog checks | 164 passed | 30 public application tables plus two private tables; 110 policies, 69 functions, 40 triggers. Expected identities match; public table RLS is enabled, constraints are validated and triggers enabled. |
| Function implementation comparison | PASS | All 69 stored function bodies match baseline bodies when Windows CRLF line endings are accounted for. Owners, fixed search paths and execution grants were also checked. |
| Auth/profile integrity | PASS, aggregate only | One Auth account, one profile, no missing/orphan profile mappings and no administrator roles. Registration and email confirmation success were reported by the owner, not rerun here. |
| Financial safeguards | PASS, metadata only | Financial and referral gates remain locked, bank details unconfigured, verification bonus disabled. Direct client financial table writes and internal money-helper execution remain restricted. Reservation INSERT is intentionally permitted; direct UPDATE/DELETE is denied. |
| Anonymous live API requests | 23 passed | GET-only checks covered public discovery/directory, denied private-table access, denied unauthenticated identity/bank-details access and non-exposure of the private schema. Public listing/directory results were empty, so populated visibility scenarios remain pending. |
| Storage | PASS, configuration only | Six buckets, zero objects; storage.objects RLS enabled and 17 storage policies. Table-level privileges do not bypass RLS. No upload/download/signed-link fixture tests executed. |
| Realtime | PASS, membership only | Public messages, chat_threads and notifications are published. Actual delivery and actor isolation remain untested. |
| Unit tests | PASS | 43 tests across nine files, including six new mocked ProtectedRoute cases. Existing React Router future-flag warnings remain. |
| Application TypeScript | PASS | `npx --no-install tsc --noEmit -p tsconfig.app.json`. |
| New-file ESLint | PASS | ProtectedRoute.test.tsx and phase4d-anonymous-checks.mjs passed. |
| Repository ESLint / build | Prior Phase 4C results only | Full ESLint previously reported 386 errors and 37 warnings; the production build previously passed with warnings. Neither full check was rerun for this test/report-only completion; existing failures are not represented as resolved. |

Read-only SQL was actually executed through Supabase CLI Management API mode with an explicit destination reference and `BEGIN READ ONLY`. No migration, application-data write, schema/policy change, account creation or operational RPC mutation was executed. No service-role session was used to simulate an application user.

## Storage findings

| Bucket | Access | Allowed content |
| --- | --- | --- |
| avatars | Public | JPEG, PNG, WebP |
| property-images | Public | JPEG, PNG, WebP, MP4, WebM |
| verification-docs | Private | JPEG, PNG, WebP, PDF |
| payment-screenshots | Private | JPEG, PNG, WebP, PDF |
| property-documents | Private | PDF, JPEG, PNG, WebP |
| chat-attachments | Private | Images, supported audio/video, PDF and octet-stream |

Every bucket's per-bucket file-size limit is NULL. The inherited project/global limit was not verified and must be reviewed in Storage settings. Public media URLs are publicly downloadable when known; property approval should not be assumed to make such URLs private. Sensitive documents belong in the four private buckets. Supabase documents the public/private and signed-download behavior in its [bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals) and [download guide](https://supabase.com/docs/guides/storage/serving/downloads).

## Findings requiring follow-up

1. AddProperty upload failures can show an error and continue to a later save/success state with missing files. Review failure, retry and partial-upload cleanup behavior before release.
2. ResetPassword accepts a recovery fragment as a reason to display its form before confirming a real recovery session. The backend still authorizes updateUser; this finding does not demonstrate a password-reset bypass.
3. PropertyDetail can fall back to static demo data when a live row is absent. Review disabling this fallback for the live marketplace. No real unapproved database row exposure was demonstrated.

These are static findings, not reproduced browser defects. Application behavior and policies were not changed to conceal them.

## Pending acceptance and next steps

Follow [AWAITING-AUTHORIZATION.md](AWAITING-AUTHORIZATION.md) for the exact actor/fixture matrix. First make an authorized browser session available and sign in privately with the existing account. Verify login, logout, reload persistence, protected navigation and failure/expiry handling. Never share passwords, tokens or recovery links in chat.

Separately approve minimal synthetic accounts/records/files and cleanup before cross-user mutation, property, messaging, reservation, upload and signed-URL tests. Do not bootstrap an administrator or bypass subscription/financial gates for this audit. Password-recovery email/password changes also need owner participation. No such writes were attempted.

Complete those runtime checks, resolve the frontend findings and review the global upload limit before treating Phase 4D as full release acceptance. The supplied attachment ends at Stage 6's “Inspect”; no missing instructions were assumed.

## Files and reproducibility

- `scripts/phase4d-anonymous-checks.mjs`: destination-allowlisted, GET-only checks; run with `node scripts/phase4d-anonymous-checks.mjs` using local public configuration.
- `src/components/ProtectedRoute.test.tsx`: mocked route-authorization regression coverage.
- `catalog-readonly.sql` / `catalog-results.json`: installed catalog and aggregate evidence, without account identifiers or secrets.
- `catalog-checks.json`: 164 recorded catalog assertions and no failures.
- `storage-readonly.sql` / `storage-results.json`: additional read-only storage RLS/privilege evidence.
- `anonymous-results.json` / `local-connection-results.json`: API and served-client evidence, without key values.
- `AWAITING-AUTHORIZATION.md`: pending runtime test plan and static findings.

Historical migrations, baseline SQL, frontend environment/connection, Lovable Cloud, administrator state and financial gates were not changed. Nothing was deployed, committed or pushed. Unrelated worktree changes were preserved.
