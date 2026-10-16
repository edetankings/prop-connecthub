# Phase 5 — Live user, workflow and security testing

Date: 2026-10-16. Verified independent project: **prtrpywkwmnpowrthppg**.

**Result: safe read-only/local preparation completed, and the owner reports successful manual testing of the functionality they exercised. Automated authenticated acceptance remains pending (BLOCKED by browser access).** This is not an entirely untested application or a completed live workflow/security sign-off. At the last connection attempt, no browser/session was available to the test tools. The existing buyer test account is approved for A1 only; A2 and all other write groups remain unapproved.

Status vocabulary: **PASS** = executed and verified; **FAIL** = executed and failed; **BLOCKED** = missing authorization/access/configuration/fixtures; **NOT TESTED** = not executed. Evidence categories below are deliberate: catalog observations and mocked tests are not authenticated workflow execution.

## Owner-reported manual testing update

The owner confirms: “I have personally opened and tested the PROP-CONNECT application, and the functionality I tested is working correctly.” This is positive **owner-reported manual testing evidence**, distinct from the automated results and source inspection below. The owner did not identify individual flows, steps or outcomes in this update; therefore it does not establish a PASS for any additional individual A1 check, every feature, or security isolation. There is no requirement to repeat A1 approval.

| Evidence category | Recorded outcome |
| --- | --- |
| Owner manual testing | Owner reports tested functionality working correctly; exact coverage unspecified |
| Previously executed local/anonymous/catalog checks | Retain their recorded results and scope |
| Automated authenticated A1 acceptance | Pending; last browser connection attempt unavailable, no new browser test executed in this documentation update |
| Individual unconfirmed A1 checks | Remain pending/BLOCKED for independent execution; no new PASS inferred from the general confirmation |

## 1. Reviewed reports and verified destination

Read PHASE-4-INTEGRATION.md, PHASE-4C-RESULTS.md, phase-4d/REPORT.md and phase-4e/REPORT.md; reviewed existing Vitest/React Testing Library coverage and relevant Auth, routes, notification, chat, inspection and financial integration code.

| Check | Status | Evidence |
| --- | --- | --- |
| Local configuration destination | PASS | New harness internally verified the exact independent HTTPS origin, public publishable-key prefix and optional matching project ID before remote requests. No credential values printed. |
| Served development client | PASS | Publicly served Vite client module at localhost:8080 matches the locally configured independent URL/key. Values compared in memory. This is not a browser network trace. |
| Unverified destination rejection | PASS | Separate local guard probe supplied a synthetic disallowed URL; the harness rejected it before API/catalog branches. No request to that URL was made. |
| Old backend/broker source and build references | PASS | Existing security scanner found zero old Supabase API references in source/built assets and no active preview broker references. |

No project was linked or switched. The old supabase/config.toml was not used as the test destination. CLI catalog access used an explicit --project-ref for the verified independent project. No frontend environment variable, credential or production setting was changed.

## 2. Authentication results

| Test/evidence | Status | Limits |
| --- | --- | --- |
| Current Auth/profile aggregate reconciliation | PASS | One Auth account, one buyer profile, no missing/orphan mapping, zero assigned admin roles. Read-only aggregate query; no personal records or UUIDs exported. |
| Independent registration, email confirmation, profile creation | NOT TESTED in Phase 5 | Owner previously reported success; historical owner evidence is not an independently executed test here. |
| Ordinary login, logout, reload persistence, expiry, recovery and actual protected-route navigation | BLOCKED | No connected browser/session. A1 suitability and authorization are confirmed; A2 recovery/password actions remain unapproved. |
| Local Auth/recovery/route regression tests | PASS | Included in the 64-test mocked suite; not a live authentication result. |

The existing account is a buyer according to aggregate metadata. The owner subsequently confirmed this account is suitable and authorized A1; no repeat permission request is needed for that scope. CLI administrative authentication is not a buyer session and was never used to simulate one. No tokens, cookies, localStorage, profiles or unrelated session stores were extracted.

## 3. Buyer workflow results

| Area | Status | Executed scope or blocker |
| --- | --- | --- |
| Anonymous property discovery, Lagos search/filter query, rental filter, public agent directory | PASS | Actual allowlisted GET requests returned expected statuses/results; listing/directory results were empty. These are API checks, not browser UI/search acceptance or populated-fixture visibility proof. |
| Buyer dashboard, own profile display, notifications, signed-in discovery/details/filters | BLOCKED | Authorized ordinary buyer session/browser missing. |
| Profile edits, welcome acknowledgement and notification read state | BLOCKED | Owner writes need explicit approval; none executed. |
| Favorites/save behavior | BLOCKED | Browser test unavailable. Source shows carousel browser-local favorites; PropertyDetail's separate Save handler currently only displays a success toast. Do not claim durable detail-page saving or a server-backed saved-property store. This is a source observation, not a reproduced live FAIL. |

## 4. Agent workflow results

Agent registration, profile/KYC, dashboard, listing create/edit, media upload, ownership, review status, messaging and inspection tests are **BLOCKED**: no agent identity/session, approved files/records or legitimate eligibility fixture. No account was created and no owner account type was changed.

Subscription, KYC and approval gates must remain effective. If an approved live attempt reaches an inactive-subscription or unverified-KYC restriction, record the actually observed restriction as expected; this phase has not executed such an attempt. Do not mark the gated workflow PASS from source alone or manufacture eligibility to continue it.

## 5. Builder workflow results

Builder registration, profile/dashboard, property ownership/management, document uploads and role-specific runtime permissions are **BLOCKED**: no builder identity/session or approved fixtures. Local compilation and route source inspection do not prove builder permissions.

## 6. Cross-user RLS findings

| Evidence/test | Status | Meaning |
| --- | --- | --- |
| All 30 public application tables retain enabled RLS | PASS | Current catalog observation. Does not prove every predicate or cross-user outcome. |
| Anonymous private-table access and non-exposure of private schema | PASS | Part of 23 live GET checks: protected tables return permission denial; private schema is not exposed through the REST API. |
| Stored function-body comparison | PASS | All 69 live stored-body hashes match the Phase 4D inspected snapshot. This is not fresh semantic execution of those functions or a full policy/grant comparison. |
| Two-identity profile/listing/chat/document isolation | BLOCKED | Only one registered identity observed and no ordinary sessions available. A known non-empty target and independent rightful-owner confirmation are required. |
| Self KYC/listing approval, role changes, system-message impersonation and financial mutation denial | BLOCKED | Negative mutations need explicit fixture/payload approval. Successful administrator creation or financial writes remain prohibited; privileged/financial runtime probes need separately approved isolated containment. |

No service-role credentials or administrative role simulation was used. No new cross-user runtime PASS or FAIL is claimed. The earlier 164 catalog assertions were not all rerun; the new harness performed its own 12 scoped destination/catalog checks.

## 7. Storage results

| Bucket | Catalog status | Current access | Objects |
| --- | --- | --- | ---: |
| avatars | PASS | Public | 0 |
| property-images | PASS | Public | 0 |
| verification-docs | PASS | Private | 0 |
| payment-screenshots | PASS | Private | 0 |
| property-documents | PASS | Private | 0 |
| chat-attachments | PASS | Private | 0 |

Storage object RLS is enabled. Allowed MIME metadata was captured without file contents. Every per-bucket size limit is NULL; the inherited global cap is **NOT TESTED** and still needs owner review.

Actual public file download, private signing/download, expiry, cross-user denial, MIME rejection, ownership enforcement, upload failure and retry are **BLOCKED** for live testing: all buckets are empty, no ordinary actor is available, and synthetic uploads/signing POSTs have not been approved. Empty buckets cannot establish protection of known private files. Mocked upload/signing regression tests passed separately. No files, real identity documents or payment evidence were uploaded.

## 8. Messaging, inspections, notifications and Realtime

Buyer-agent thread creation, message delivery, restricted conversations, inspection requests/responses, generated notifications and cross-user event isolation are **BLOCKED** by sessions/fixtures/write approvals. No messages, threads, reservations, inspection transitions or notification read-state changes were created.

Realtime publication membership is **PASS as catalog evidence only**: chat_threads, messages and notifications. Actual subscription delivery, ordering/reconnect behavior and isolation are **BLOCKED**, not PASS.

The prepared procedure distinguishes navigation from writes:

- Login invokes touch_last_login, whose installed baseline function updates the current profile's last_login_at; Auth login/refresh/logout also change session state.
- Closing the welcome dialog updates profiles.welcome_seen.
- /chat/new can insert a thread during initialization.
- Opening /chat/:threadId updates message seen flags; incoming events may also trigger seen updates.
- Notification click/mark-read actions update notification rows.

These source findings inform approval boundaries. No action was executed to test them against the owner account. Source-only concerns, including ignored errors in some read/notification handlers, remain follow-up test targets rather than invented live failures.

## 9. Financial safeguards

| Check | Status | Evidence/limit |
| --- | --- | --- |
| Money operations locked | PASS | One platform_settings row; money_rules_approved false. No successful-payment workflow attempted. |
| Referral payouts locked | PASS | referral_rules_approved false; verification bonus policy unset. No payout attempted. |
| Bank collection details unconfigured | PASS | Aggregate NULL check; no bank values exported. |
| Wallet accounting has no nonzero balances | PASS | Aggregate predicate checks balance, escrow and withdrawal-reserved amounts; empty sets also satisfy this predicate. No individual balances exported or credits created. |
| Direct financial table-wide mutations ungranted | PASS | Authenticated INSERT/UPDATE/DELETE table-wide privileges absent on wallets, transactions, earnings, withdrawals, subscriptions and escrow_holds. This check does not separately enumerate column grants. |
| Withdrawal approval, subscription activation, credits and settlement runtime denial | BLOCKED | No approved isolated negative tests; no mutation RPCs invoked. Current locks/function hashes do not substitute for actor runtime proof. |
| Successful payments, withdrawal approval, bonus payout, activation or artificial credit | NOT TESTED | Explicitly prohibited; none enabled or attempted. |

No financial flag was changed. No administrator was created. Existing financial gates remain locked according to the current read-only snapshot.

## 10. Bugs fixed and local changes

**No new live frontend bug was executed and verified in Phase 5; no application behavior was changed.** Phase 4E fixes and their uncommitted work were preserved. Source observations above are not mislabeled as live defects or acceptance results.

New local files:

- scripts/phase5-readonly-checks.mjs: destination-guarded, no-credential-output served-client/catalog harness.
- database/phase-5/safety-readonly.sql: BEGIN READ ONLY catalog/aggregate observations.
- database/phase-5/readonly-results.json, catalog-results.json, anonymous-results.json, harness-guard-result.json: executed evidence without operational records/secrets.
- database/phase-5/TEST-MATRIX.md: buyer, agent, builder, Auth, profiles, properties, storage, messaging, inspections, notifications, Realtime and cross-user cases.
- database/phase-5/OWNER-APPROVALS.md: concrete account/fixture/write/signing/cleanup boundaries.
- database/phase-5/READONLY-HARNESS.md and this report: repeatable safe commands and controlled actor procedure.

Existing script changed: scripts/phase4d-anonymous-checks.mjs accepts an optional output path, preserving its prior default, allowlisted destination and GET-only checks. This phase used a new report path instead of overwriting Phase 4D evidence. Previous worktree modifications were retained.

## 11. Automated validation results

| Check | Status | Result |
| --- | --- | --- |
| Application TypeScript | PASS | npx --no-install tsc --noEmit -p tsconfig.app.json |
| Build configuration TypeScript | PASS | npx --no-install tsc --noEmit -p tsconfig.node.json |
| Unit tests | PASS | npm test -- --maxWorkers=1 --no-file-parallelism: 64 tests, 14 files; mocked backend calls. Existing React Router future-flag warnings remain. |
| Production build | PASS | npm run build; existing stale Browserslist, CSS @import order and large-chunk warnings. No SEO output content changes. |
| Phase 5 changed-file ESLint | PASS | Both changed/new audit scripts passed; no rule suppression. Application source was not changed this phase. |
| Repository-wide ESLint | FAIL | 375 errors, 37 warnings; unchanged from Phase 4E. Existing lint debt is not hidden or declared resolved. |
| Anonymous security checks | PASS | 23/23 actual GET probes; source/dist old-backend and broker checks zero. |
| Destination/catalog harness | PASS | 12/12 scoped checks; not 12 authenticated workflows. SQL explicitly enforced read_only=on. |
| Wrong-destination guard | PASS | Synthetic disallowed origin rejected locally before remote branches. |
| Diff whitespace validation | PASS | git diff --check; only Git line-ending normalization notices, no whitespace errors. |

Read-only SQL **was executed** against the verified independent project through the owner-authenticated CLI. This was not a migration, operational write, Auth account operation or ordinary actor test. Raw CLI output, tokens and credentials were not published.

## 12. Blocked tests and required owner approvals

See [TEST-MATRIX.md](TEST-MATRIX.md), [OWNER-APPROVALS.md](OWNER-APPROVALS.md) and [READONLY-HARNESS.md](READONLY-HARNESS.md). The owner has performed successful manual testing with unspecified coverage; the individual live actor cases remain BLOCKED for independent automated acceptance. A1 consent and buyer-account suitability are confirmed. A connected supported browser is needed for automated execution; A1 does not need approval again. The owner signs in privately; no credentials should be sent in chat.

Further approvals are separate: A2 recovery/password changes; A3 profile/welcome fields; A4 synthetic agent/builder accounts; A5 eligible listings; A6 small synthetic objects/signing; A7 bounded messaging/inspection/notification activity; A8 contained negative mutations; A9 explicitly scoped cleanup. No group is implied by approval of another. No operational write or cleanup was attempted while waiting.

## 13. Readiness for Phase 6

**BLOCKED for a completed live-workflow/security handoff or production cutover.** Owner-reported manual success supplements the passing safe/local checks. Case-specific authenticated acceptance, two-identity authorization, populated listings, real private-file access and Realtime delivery remain independently unverified, and repository lint remains failing. No scope for Phase 6 was provided that would justify bypassing those acceptance gaps.

Proceed next with the approved subset of the prepared authenticated test matrix. If eligibility gates prevent positive tests, preserve the gate and document the restriction; obtain appropriate fixtures/isolated rehearsal access rather than changing money flags, roles or security policies.

No Lovable Cloud resources were modified or deleted. No migrations, reset, RLS/Storage/Auth configuration changes, account creation, administrator bootstrap, operational writes, financial activation, Edge Function deployment, production configuration update, commit or push occurred. No browser session extraction was attempted.

## A1 authorization follow-up — 2026-10-16

A1 only is authorized: existing buyer login/logout, refresh persistence, touch_last_login verification, read-only buyer dashboard/profile, local favorites and independent destination verification. No password, token or API-secret request was made. No A2 action, financial test, upload, profile edit, welcome acknowledgement or notification/message mutation was performed.

| A1 item | Status | Actual evidence |
| --- | --- | --- |
| Independent destination preflight | PASS | Fresh destination-only harness run verified local configuration and the served Vite client; a1-preflight-results.json contains both results. No remote SQL/catalog/financial checks were rerun for this A1 follow-up. |
| Connected application browser | BLOCKED | Browser selection returned “No browser is available”; supported discovery returned an empty list. No ordinary application session accessed. |
| Login/logout, refresh persistence | BLOCKED | Not executed; browser unavailable. Account approval alone is not a runtime result. |
| touch_last_login update verification | BLOCKED | Not invoked or compared around a login; no claim that the timestamp changed. |
| Read-only buyer dashboard/profile | BLOCKED | Not opened in an authenticated browser. |
| Local favorites | BLOCKED | No browser interaction or local-storage inspection performed. A real existing listing may also be required for a positive favorite test; none may be created under A1. |
| A2 recovery/password changes | BLOCKED | Not approved and not executed. Request separate approval only when ready to proceed beyond A1. |

Follow BROWSER-CONNECTION.md, sign in privately using the approved account, and report that the browser is ready. Existing A1 approval persists. Do not dismiss the welcome dialog: that would update welcome_seen and needs A3; if it prevents read-only navigation, stop and report that blocker. Earlier build/unit/lint results above are historical Phase 5 validation, not newly executed authenticated tests.

## Remaining A1 checklist and A2 prerequisites

These are remaining case-specific verification items, not a claim that the owner has never exercised them. A specific owner confirmation may be recorded as owner-reported evidence for that case; an automated PASS requires actual automated execution and verification.

- [ ] Confirm successful login with the existing buyer account.
- [ ] Confirm logout removes authenticated access and a private route requires login again.
- [ ] Confirm refreshing the same testing origin retains the correct signed-in buyer/profile.
- [ ] Verify last_login_at before/after an actual login, without exporting private profile data; no timestamp change has yet been established.
- [ ] Confirm the read-only buyer dashboard and own profile display correctly; do not save edits or dismiss a write-triggering welcome dialog.
- [ ] Confirm saving/unsaving a real existing listing and reloading preserves the implemented local favorite state. No listing may be created under A1; an absent fixture remains a blocker.
- [ ] Complete independent authenticated browser execution when a supported session is connected. Local/served-client destination preflight already passed for prtrpywkwmnpowrthppg; verify the intended origin before resuming.

Before A2: document the A1 outcomes and remaining exceptions, obtain **separate explicit A2 approval** for a recovery email and password change, confirm the approved account's owner can access its confirmation/recovery inbox, and have the owner participate privately in a connected browser. Use the approved origin and reset redirect; report a redirect/delivery blocker rather than changing production/Auth configuration. Never request credentials or recovery links in chat. A2 remains unapproved and no reset email/password change will be attempted automatically. No requirement here authorizes financial operations, deployments, commits or pushes.

This owner-report update modified documentation only; no new application tests, database requests, deployments or financial operations were executed.
