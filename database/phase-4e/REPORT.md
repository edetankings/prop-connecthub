# Phase 4E — Frontend stability fixes

Date: 2026-10-16. Scope: the three findings in [Phase 4D](../phase-4d/REPORT.md), plus directly related upload and discovery error handling.

## Root causes and corrections

### 1. Upload failures and private attachments

AddProperty toasted storage errors and continued its image, video and PDF loops. It could then save incomplete data and announce success. A document failure after the property insert also left a confirmed listing behind, so starting the same submit flow again could insert another listing.

- Image, video and PDF storage failures now stop the flow and reach the error handler. No save-success toast or navigation occurs after those failures. Media uploads run sequentially so a rejected operation does not leave a parallel upload running after the UI resets.
- A synchronous submission lock prevents duplicate requests. Confirmed uploads are retained in component memory; failed uploads remain retryable. Confirmed property IDs are reused on retry, and confirmed document records are skipped. Document metadata retries reuse the confirmed private object path.
- If a listing exists but its documents failed, the message explicitly says the listing is incomplete and asks the user to retry on the same page. It does not claim publication/submission succeeded.
- Avatar uploads and secure-payment proof uploads now reset loading in finally even when a transport request throws. The avatar input resets after failure so the same file can be selected again. Existing returned-error checks remain in place, and subscription payment submission rejects a second request while uploading.
- KYC already stopped on returned upload errors. Its submission guard/finally now make retry/loading handling explicit, and a failed notification insert no longer produces an unconditional success notification for the whole flow. A saved KYC record with notification failure is reported as a partial result.
- Private signed-link resolution catches transport rejection and returns no link. It retains rejection of absolute URLs and traversal paths. Admin receipt viewing uses that shared resolver, without a public fallback. Chat media clears stale URLs when paths change and displays unavailable states when signing fails; voice notes no longer leave an indefinite loading state for a missing path.
- Chat uploads already throw returned storage errors and callers catch errors and reset file-upload state; their ownership path and private-bucket behavior were preserved and regression-tested.

All six bucket names, existing ownership paths, policies and MIME/size checks were preserved. No remote uploads, downloads of private files, cleanup deletes or storage configuration changes were performed.

**Partial-save limitation:** browser requests to Storage and PostgREST are not one transaction. Successful objects can remain after later failure. Retry memory lasts only while the component is mounted. A lost insert response cannot prove whether the server committed the insert; this change does not claim durable idempotency across lost responses, reloads or closed tabs. No automatic deletion was added.

### 2. Password recovery state

The reset page accepted `#type=recovery` without checking whether the SDK had established a session. It also lacked subscription cleanup, rejection handling and a synchronous duplicate-submit guard.

- A URL fragment alone cannot enable password updates. The page accepts an SDK PASSWORD_RECOVERY event with a session, or an SDK session whose identity is validated with Auth getUser. This supports links processed before page mount and preserves an already authenticated user's ability to update their own password. It does not assert that an arbitrary normal login proves arrival through a recovery email.
- Explicit link error/error_code parameters show the invalid/expired-link state even when an existing session is present. Rejected session/identity checks cannot leave the page stuck verifying.
- Logout invalidates the form. Revision checks stop older initialization results overwriting a later Auth event. A late password-update response after invalidation cannot show success.
- Password update requires a confirmed returned user and no Auth error. Existing eight-character minimum and confirmation matching remain. Duplicate submissions are blocked; editable email/password fields are disabled while pending.
- Email-request and new-password routes remain separate. Failed reset-email requests retain the request form with an error and retry; only a successful Auth response shows the email confirmation. The existing same-origin reset redirect is preserved.
- Auth listeners and the delayed login-navigation timer are cleaned up on unmount. No account, password, reset email or Auth configuration was changed during development/testing.

### 3. Demo-property fallback and discovery states

PropertyDetail looked up a static mock ID alongside its database query, allowing demo prices, agents and availability to render when the real row was absent or the query failed. Discovery pages also collapsed query errors into empty arrays.

- PropertyDetail no longer imports or looks up the demo property array. Displayed fields, relationship IDs, actions and property SEO data derive only from a returned database record. Missing data renders not-found; failures render an error with Retry; loading remains distinct. A missing image uses the existing neutral placeholder, not a demo property photo.
- Property and agent responses are discarded after relevant route changes. Stale agent data is cleared rather than reused for another listing.
- Properties, the homepage's curated listings, public agent listings and announcement listings distinguish loading, successful empty results and failed queries. Failure states provide Retry and do not render stale property cards.
- Source inspection found no other runtime import of the mock property array. Existing mockData imports used solely for formatting, trust-badge helpers or types were retained. No development-only demo switch was needed.
- Rental cards now use listing_type rather than approval/availability status for their sale/rent label. Missing property photos use a neutral placeholder rather than stock marketplace imagery, including the existing unused cinematic card implementation. Property structured data derives availability from the returned status: live statuses are InStock, sold/rented are SoldOut, and other states omit the claim.

Existing layout, styling, production URLs, filters and database security enforcement were retained. Marketing photography is not presented as a query-result property card by these changes.

## Files inspected and modified

| Area | Modified files |
| --- | --- |
| Upload flows | src/pages/AddProperty.tsx, Settings.tsx, Payments.tsx, SecurePayment.tsx; src/hooks/useKYCVerification.ts |
| Private file rendering | src/lib/storageUrl.ts; src/pages/AdminSecurePayments.tsx; src/components/chat/MessageBubble.tsx, VoiceNotePlayer.tsx |
| Recovery | src/pages/ForgotPassword.tsx, ResetPassword.tsx |
| Marketplace states | src/pages/PropertyDetail.tsx, Properties.tsx, Index.tsx, AgentProfile.tsx, Announcements.tsx; src/components/PropertyCarousel.tsx |
| Regression coverage | src/pages/AddProperty.test.tsx, Recovery.test.tsx, PropertyQueries.test.tsx; src/lib/chatAttachments.test.ts, storageUrl.test.ts; src/components/PropertyCarousel.test.tsx |
| Evidence | database/phase-4e/REPORT.md, lint-results.json |

Also inspected without changing: Phase 4D report, App routing, generated Supabase types, the Auth SDK's initialization/recovery-event implementation, chat upload callers, chatAttachments.ts, SignedBucketAsset.tsx, KYCSubmissionForm.tsx, IdentityVerification.tsx, property cards/carousel, PDF/video upload controls and mock-data imports.

## Validation

Command results are recorded below. All regression service calls are mocked; no accounts, properties, messages or files are created remotely by the unit tests.

| Check | Result |
| --- | --- |
| Application TypeScript | PASS — npx --no-install tsc --noEmit -p tsconfig.app.json |
| Build configuration TypeScript | PASS — npx --no-install tsc --noEmit -p tsconfig.node.json |
| Unit tests | PASS — npm test -- --maxWorkers=1 --no-file-parallelism: 64 tests across 14 files. Existing SeoDefaults tests emit React Router future-flag warnings. |
| Production build | PASS — npm run build. Existing warnings: stale Browserslist data, CSS @import ordering and a large JavaScript chunk. Generated SEO files have no content changes. |
| Modified-file ESLint | 34 errors, two warnings inherited from HEAD; zero new diagnostics across 23 scoped source/test files. New tests have no lint diagnostics. See lint-results.json for the file-by-file comparison. |
| Repository ESLint | Fails: 375 errors, 37 warnings. Previous Phase 4C count was 386 errors, 37 warnings. No rules were suppressed or weakened. |
| Non-destructive security checks | 23/23 GET-only anonymous API checks passed against the verified independent project; no old backend API references in source/built assets and no active preview-auth broker references. Existing unit tests also cover financial gating and configuration safeguards. The prior 164 live catalog assertions were not rerun in Phase 4E. |
| Diff whitespace check | PASS — git diff --check. Git's line-ending normalization notices are not whitespace errors. |

Regression coverage includes denied image uploads and retry; video transport failure; private document failure after listing save; metadata retry without another upload; forged/expired recovery links; validated sessions after early SDK URL processing; password/email failures and retry; duplicate password updates; logout invalidation; successful empty and failed marketplace queries; prevention of demo detail/SEO output; sold-listing structured availability; real rental labeling; neutral image placeholders and confirmed property links; signing rejection; and private chat upload failures.

## Remaining limitations and workflow readiness

The frontend corrections are ready for controlled authenticated workflow testing: TypeScript, unit tests, production build and the non-destructive API checks passed, with no new lint diagnostics. Repository lint remains failing as documented above. This is not full live acceptance: browser rendering, actual recovery emails, expired real links, signed-in uploads, cross-user authorization, real signed URL expiry and positive marketplace workflows still require authorized application sessions and synthetic fixtures under the [Phase 4D plan](../phase-4d/AWAITING-AUTHORIZATION.md).

Avatar/payment/KYC UI hardening and ancillary homepage/agent/announcement states were source-reviewed and type-checked; the new focused component tests exercise AddProperty, recovery, primary property discovery/detail and the carousel. Do not interpret that as every upload screen having a browser test. Financial workflows remain locked; do not bypass those gates to obtain test coverage. The inherited global upload limit remains an owner review item.

No remote database/schema/RLS changes, account creation/deletion, administrator bootstrap, financial activation, Edge Function deployments, production configuration changes or Lovable Cloud changes were performed. Historical SQL and credentials were untouched. Unrelated worktree changes were preserved. Nothing was committed or pushed.
