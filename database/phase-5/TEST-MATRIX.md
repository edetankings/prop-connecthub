# Phase 5 controlled test matrix

Target: `prtrpywkwmnpowrthppg`. Statuses: PASS = executed and verified; FAIL = executed and failed; BLOCKED = authorization/access/fixture prerequisite missing; NOT TESTED = not executed. A mocked regression or catalog check is not a live workflow PASS.

At the last connection attempt, no browser/session was available to the test tools. The owner has confirmed the existing buyer test account is suitable and approved A1 only. The owner subsequently reports personally testing the application successfully, with exact functionality unspecified. This manual evidence is acknowledged; it does not identify individual case outcomes. The BLOCKED statuses below describe independent automated/live-case acceptance and missing access/fixtures/approvals, not an absence of all owner testing. No new individual PASS is inferred and no new browser check was attempted for this documentation update.

## Authentication, buyer and profile cases

| ID | Test/action and expected result | Access/write boundary | Status |
| --- | --- | --- | --- |
| AU-01 | Owner privately logs in at /login; genuine identity/profile displayed, Auth UUID maps to profiles.user_id | A1: account suitability and Auth session changes; signIn also invokes touch_last_login | BLOCKED |
| AU-02 | Reload same origin and reopen permitted routes; identity/profile persist without stale users | A1; automatic token refresh may update Auth session state | BLOCKED |
| AU-03 | Sign out, then open /dashboard and /admin directly; login required, no prior private content returns | A1: session invalidation; ordinary account must never render admin content | BLOCKED |
| AU-04 | Invalid login, expired session and failed refresh display accurate error/route state | A1, controlled account; avoid account lockout/rate-limit bursts | BLOCKED |
| AU-05 | Request and consume a recovery email, change password, test expired/invalid link and login with new password | A2: email/password changes; owner participation; no link/token logging | BLOCKED |
| PR-01 | Open /settings and own profile; correct user and editable fields displayed without private data from another account | A1, existing authorized session, no Save | BLOCKED |
| PR-02 | Change one approved non-sensitive test field and restore its approved original value; verify persisted value and failures | A3: exact owner-approved field, value and restoration | BLOCKED |
| BY-01 | Open /dashboard/buyer; own data loads and no unrelated purchases/messages appear | A1; owner must actually be a buyer | BLOCKED |
| BY-02 | Open /properties, search/filter/sort and open a returned real property ID | A1; positive fixture A5 needed if public results empty | BLOCKED |
| BY-03 | Zero results show empty state; failed query shows Retry; missing/demo ID never renders a real listing | A1/browser; local mocked cases separately pass in the regression suite | BLOCKED |
| BY-04 | Save/unsave an existing property and reload; assert only the implemented persistence behavior | A1/local favorite change; card carousel uses browser-local favorites, not a server saved-property store | BLOCKED |
| BY-05 | Open notifications without selecting/marking; only own notifications visible | A1; positive notification fixture A7 may be needed | BLOCKED |
| BY-06 | Mark selected test notification read; own count updates and failures are not shown as success | A7: notification update and read-state changes | BLOCKED |

## Agent and builder cases

| ID | Test/action and expected result | Prerequisite/expected restriction | Status |
| --- | --- | --- | --- |
| AG-01 | Register a synthetic agent, confirm email and verify one correctly typed profile | A4: agent identity and confirmation email; no metadata admin role | BLOCKED |
| AG-02 | Open /dashboard/agent, profile and /verification; show own data and true KYC state | A4 ordinary agent session; opening profile is not KYC approval | BLOCKED |
| AG-03 | Submit approved synthetic KYC files; persist owned private paths; upload failure offers retry without false success | A6 and approved KYC test record; never real identity/bank evidence | BLOCKED |
| AG-04 | Open /add-property with inactive subscription/unverified KYC; expected gate blocks prohibited progression | A4; a displayed gate is an expected restriction once actually observed, not a failed workflow | BLOCKED |
| AG-05 | Create/edit approved synthetic listing with sale/rental type; owner persistence and review status correct | A5 and a legitimately eligible account; do not manufacture subscription or verification | BLOCKED |
| AG-06 | Retry failed image/video/document save without duplicate confirmed listing or success toast after failure | A5/A6, controlled failure; retained retry state is component-local | BLOCKED |
| AG-07 | View own inspections/messages; authorized response updates the approved fixture and unrelated actions fail | A7/A8; never auto-open chats under a read-only label | BLOCKED |
| BU-01 | Register/confirm synthetic builder; correct builder profile and no privileged role | A4: separate builder identity/email | BLOCKED |
| BU-02 | Open /dashboard/builder and /settings; correct role-specific data and actions | A4 builder session; do not convert owner's profile type | BLOCKED |
| BU-03 | Create/edit own approved test listing, attach document, inspect review status | A5/A6 and genuine eligibility; existing backend gates remain authoritative | BLOCKED |
| BU-04 | Attempt edit of another approved fixture's listing; denied and all protected fields unchanged | A8 controlled negative mutation; both owners independently authenticated | BLOCKED |

## Cross-user boundaries

Use identity aliases A (existing buyer only if approved), B (agent), C (builder). Establish each identity through ordinary supported Auth in separate browser profiles/contexts. No service-role sessions. Record only aliases, boolean outcomes and redacted counts, not credentials, profile contents or tokens.

| ID | Test and verification | Prerequisite | Status |
| --- | --- | --- | --- |
| X-01 | A reads A's own profile; A's attempted read of B's private profile returns no private row/permission denial; B independently confirms its fixture exists | At least two approved sessions; known non-empty target. Empty database responses alone are inconclusive | BLOCKED |
| X-02 | B attempts approved harmless edit on C's listing; denial verified by C rereading original field | A4/A5/A8; exact field/payload approved before request | BLOCKED |
| X-03 | C tries to read A-B's known conversation/messages; denied, while participants can read them | A4/A7 and genuine ordinary sessions | BLOCKED |
| X-04 | C cannot sign/download B's known verification/payment/property/chat document; authorized owner/participant can access only as policy permits | A6; known file and exact intended authorization required | BLOCKED |
| X-05 | Self KYC/property approval and trust-score mutation must fail with protected fields unchanged | A8 and expendable synthetic fixtures; specify negative payload and stop procedure before testing | BLOCKED |
| X-06 | Privileged role self-assignment must be impossible | BLOCKED for live mutation: strict no-admin rule. Requires separately approved isolated rehearsal with rollback containment; installed grants/policies can be inspected read-only here | BLOCKED |
| X-07 | Financial writes/credits/activation must be impossible outside checked authorization | No live money mutation or artificial credits authorized. Use catalog/gate observations now; controlled runtime denial tests require separately approved isolation | BLOCKED |
| X-08 | Ordinary sender cannot impersonate system messages or another participant | A7/A8 synthetic thread; negative payload approval; verify no message was inserted | BLOCKED |

## Storage, messaging, inspections and Realtime

| ID | Test and expected result | Prerequisite | Status |
| --- | --- | --- | --- |
| ST-01 | Public avatars and property-images can be downloaded by URL; owner uploads obey folder/MIME restrictions | A6 known synthetic public objects; policy metadata alone is separate evidence | BLOCKED |
| ST-02 | verification-docs, payment-screenshots, property-documents and chat-attachments reject anonymous/unrelated reads | A6 positive/negative objects and authorized contexts; known absence is not protection proof | BLOCKED |
| ST-03 | Approved actor obtains short-lived private URL; unauthorized signing fails; expiry prevents a fresh download | A6; signed URL creation is a Storage POST and requires approval; URLs are bearer capabilities and must not enter reports | BLOCKED |
| ST-04 | Wrong folder owner and disallowed MIME uploads rejected; no success indicator; same valid file can be retried | A6/A8; synthetic bytes only; rejection must come from policy/MIME enforcement, not a nonexistent bucket | BLOCKED |
| ST-05 | Review inherited global upload cap and test approved boundary size | Owner Storage settings evidence, then explicit A6 payload sizes; do not infer global limit from NULL bucket limit | BLOCKED |
| MS-01 | Buyer starts approved thread, sends a synthetic message; agent receives it | A7; /chat/new may insert a thread on mount | BLOCKED |
| MS-02 | Restricted/blocked conversation rejects disallowed operations with accurate UI state | A7 eligible existing restricted fixture; no admin activation/bypass | BLOCKED |
| MS-03 | Opening a test thread marks only authorized incoming messages seen | A7: read receipts are remote UPDATEs, including incoming Realtime messages | BLOCKED |
| IN-01 | Buyer requests approved synthetic inspection; own participants/property relationships preserved | A7 property, date and participants; no real operational appointment | BLOCKED |
| IN-02 | Agent accept/decline/propose and buyer accept/cancel use authorized state transitions; errors do not show success | A7 exact transition plan; don't assert cancellation RPC rolls back every side effect | BLOCKED |
| NT-01 | Approved notification is visible only to recipient; mark-read does not affect other identity | A7 generated by approved workflow; no arbitrary notification injection | BLOCKED |
| RT-01 | Authorized participants receive messages/threads/notifications; unrelated identity does not | A7 three contexts, approved producer writes and actual observed event delivery | BLOCKED |

## Tests not attempted

| Area | Status | Reason |
| --- | --- | --- |
| Successful payments, withdrawals, referral payouts, subscription activation and artificial balances | NOT TESTED | Explicitly outside authorized scope; remain disabled |
| Administrator bootstrap, approval operations and successful privileged role assignment | NOT TESTED | Explicitly prohibited in this phase |
| Edge Function deployment, paid AI/OTP service activation and provider calls | NOT TESTED | No deployment/service changes authorized |

PASS entries for configuration, anonymous API, catalog safeguards and local regressions belong in REPORT.md with their evidence category. They do not change any BLOCKED live actor result above.

## A1 approval update — 2026-10-16

- Approved: buyer login/logout, session persistence after refresh, touch_last_login verification, read-only buyer dashboard/profile, local favorites and independent destination verification.
- Fresh local/served-client destination checks: PASS (a1-preflight-results.json). Browser discovery: BLOCKED, no connected browsers.
- AU-01, AU-02, AU-03, PR-01, BY-01 and BY-04 remain BLOCKED for actual browser execution. AU-04 expiry/failure simulation is not expressly included in the narrowed A1 authorization and will not be attempted automatically. Other prior matrix cases are not automatically authorized by A1.
- Login timestamp before/after verification is BLOCKED until an actual approved login can be performed. No timestamp update has been claimed or simulated.
- A2 is unapproved. No recovery email or password change may run. No new accounts, listings, files, chats or financial operations are authorized.
- Connect the browser using BROWSER-CONNECTION.md. Do not request A1 approval again.

## Owner manual evidence and remaining verification

Owner-reported outcome: personally opened/tested the application; exercised functionality works correctly. Coverage is unspecified, so no individual A1 row has been promoted to PASS. Specific future confirmations should name the case/steps and remain labelled owner-reported; automated acceptance is separate.

Remaining A1 evidence: AU-01 login, AU-02 refresh persistence, AU-03 logout/protected access, PR-01 own profile display, BY-01 read-only buyer dashboard, BY-04 local favorite save/unsave/reload with a real existing listing, and the login timestamp before/after comparison. Destination preflight already passed; independent authenticated browser execution remains pending.

A2 requires separate explicit authorization for a recovery email/password change, an owner-accessible inbox and private participation through a connected browser. Record A1 outcomes/exceptions first. No A2 request has been executed; A1 approval remains sufficient for its existing scope.
