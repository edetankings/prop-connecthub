# Sprint 6 — Administrative and operational workspaces

Status: local UI implementation. Rendered visual acceptance, authenticated workflow testing and backend acceptance remain outstanding. This sprint does not establish production readiness.

## Architecture and capability audit

The existing React Router declares protected messaging and deal routes and administrator-only dashboard, overview, property monitoring, disputes, audit, inspection, payment and withdrawal routes. `AdminRoute` uses the existing authenticated session and administrator role check. Its implementation and the Auth provider are unchanged. Database RLS, checked RPCs and Storage policies remain authoritative; a navigation item or disabled button is not an authorization boundary.

| Area | Existing support and retained limits |
| --- | --- |
| Identity | Auth UUIDs identify profiles through `profiles.user_id` and assigned roles through `user_roles.user_id`. Profile UUIDs identify listing owners and conversation participants. No role assignment UI is added. |
| Overview | Authorized exact-count queries for profiles/categories, properties/review queue, pending KYC, requested inspections and transaction records under review. Profiles are counted, not privileged Auth-directory entries. No revenue, growth, conversion or escrow-success claims. |
| User management | Existing authorized profile reads, assigned-role display, verification review, directory visibility and participant chat. No account suspension field is invented. Account deletion remains unavailable pending the existing server-side retention/deletion review. |
| Professional verification | Existing KYC submissions, verification steps/documents, current status, reasons and recorded update dates. Overall KYC approval is distinct from individual step approvals. A complete status-history service is not invented. |
| Property moderation | Existing review status, media, owner context, document metadata, approve and return-to-draft operations. The schema does not supply a persisted property rejection-reason workflow; the UI does not pretend to save a reason. Draft is not synonymous with rejected. |
| Messaging | One shared inbox/thread for buyers, agents and builders. Queries remain scoped to participating profile UUIDs; participant names use `get_chat_participants`. Existing unread counts, attachments, seen handling, contact restrictions and subscriptions remain. Administrator status does not introduce a private-conversation browser. |
| Inspections | Existing reservations and recorded requested/proposed schedule, notes and statuses. Buyer/agent responses retain their RPC contracts. Administrator inspection views are read-only; no available slots or invented scheduling history. |
| Deal tracking | Existing deal requests, linked transactions, deal events, reservations, document metadata and scoped `get_deal_participants`. Read-only tracking does not infer prior milestones from the current stage. Private document paths/download URLs are not exposed. |
| Account settings | Existing settings page in the shared administrator shell. No new system-wide switches, feature activation, role editing or administrator bootstrap. |
| Financial operations | Existing backend locks remain untouched. The redesigned screens offer no payment, checkout, transfer, release, refund, payout or completion action. Historical stored statuses are not proof of financial settlement. |

## Implementation

`WorkspaceShell` now presents administrator navigation while retaining the existing buyer/professional layout and role-specific destinations. Administrator pages use the established forest, emerald, sage, ivory and charcoal theme, Manrope headings and Inter interface typography. Mobile navigation continues to use the existing accessible Sheet.

Both administrator overview destinations reuse `OperationsOverview`. Counts have loading, failure and genuine-zero states. A failed request never displays a fabricated zero. Counts use exact-count requests; the legacy operations datasets remain returned-record lists rather than a guarantee of fetching every row beyond service response limits.

`UserDirectory` provides local name/location search, category and KYC filters, separate assigned-role display, last recorded login, directory visibility and a read-only profile dialog. Dense rows become labelled mobile cards. It does not expose an account-ban status, enable deletion or offer administrator self-assignment.

The existing admin dashboard remains the review implementation. Property, KYC, document and visibility decisions use a shared accessible confirmation dialog, pending lock, acknowledgement checks and retryable failure feedback. KYC rejection requires a recorded reason. An acknowledged step review remains successful if its separate existing notification request fails; the notification failure is reported separately. No database trigger, verification eligibility or moderation rule is changed. Zero steps no longer imply verified KYC. Property filtering now uses React state instead of a window-global variable.

The older admin reservation interface is replaced with the existing shared `Inspections` component in read-only admin mode. The old admin-wide active-chat inspection is replaced by deal records; its message-count/enrichment requests are removed. Existing admin-to-user chat remains a participant operation under the original backend permissions and may be denied where the participant type is unsupported.

Audit logging and property monitoring retain their existing limits (latest 500 audit entries, up to 200 properties for the selected status) with explicit loading, error, retry and empty states. Non-financial dispute review offers only `under_review`, `resolved` and `rejected`, matching the baseline `resolve_dispute` contract. Existing refunded records can still be filtered and viewed; no refund action is supplied.

The shared inbox now includes builders in its Professionals filter and matches returned property titles in local search. Conversation search has an accessible name and a no-match state. Active conversation status no longer implies an active financial deal. Existing Realtime subscriptions are preserved, not claimed as live-verified delivery.

`DealsList` preserves the buyer Auth UUID filter and admin route permissions. `DealRoom` displays recorded status, actual event dates, permitted participant names, inspection records and document references. The previous payment link and stage-advance controls are removed from this tracking experience. The chat property card also presents a disabled financial control instead of an active payment initiation button. Existing SQL and backend feature gates are not changed.

## Responsive design and interaction

`operations.css` provides flexible record grids, deliberate mobile table cards, wrapped section navigation, touch-sized controls, bounded scrolling dialogs, safe-area spacing, focus indicators and reduced-motion behavior. It builds on the existing workspace breakpoints instead of introducing another layout system. No new packages, decorative operational imagery or fabricated charts were added.

Browser selection returned “No browser is available”; supported discovery returned an empty list. No screenshot, viewport inspection, live sign-in, private-file review, moderation write, chat send or inspection mutation was executed. Required rendered widths are **320, 360, 375, 390, 430, 768, 1024 and 1440px**, all pending. CSS and DOM tests are not visual evidence.

## Files

Modified:

- `src/components/AuthenticatedLayout.tsx`
- `src/components/WorkspaceShell.tsx`
- `src/components/chat/ChatPropertyCard.tsx`
- `src/index.css`
- `src/pages/AdminAudit.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminDisputes.tsx`
- `src/pages/AdminOverview.tsx`
- `src/pages/AdminPropertyMonitoring.tsx`
- `src/pages/Chat.tsx`
- `src/pages/ChatInbox.tsx`
- `src/pages/DealRoom.tsx`
- `src/pages/DealsList.tsx`
- `src/pages/Inspections.tsx`

Added:

- `src/components/admin/OperationsOverview.tsx`
- `src/components/admin/UserDirectory.tsx`
- `src/components/admin/Operations.test.tsx`
- `src/pages/ChatInbox.test.tsx`
- `src/pages/DealTracking.test.tsx`
- `src/styles/operations.css`
- This report.

No historical report or other repository file was deleted. The separately approved ten-file cleanup is already part of the starting commit; its passing 121-test baseline is retained as the comparison point. The starting worktree was clean.

## Validation

| Check | Final result |
| --- | --- |
| Application TypeScript | Passed: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` |
| Tooling TypeScript | Passed: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json` |
| Full suite | Passed: **141 tests / 26 files**, zero failures, skips or pending tests; 20 tests added over the 121-test baseline |
| Focused new regression suite | Passed: **20 tests / three files** |
| Production build | Passed: `npm run build`; existing outdated Browserslist and large-chunk warnings remain |
| Repository ESLint | **266 errors / 19 warnings**, compared with **308 / 26**; diagnostic-identity comparison found no additions |
| Protected integrity | **102/102** original Sprint 5 protected-file hashes match |
| Routes | All **50** route declarations retained; routing file unchanged |
| File preservation | No existing repository file deleted; only the 14 listed existing frontend files changed |
| Backend/environment/manifests | No changes to database/, supabase/, drizzle/, environment files, package.json or package-lock.json |
| Whitespace | `git diff --check` passed |
| Browser/live acceptance | Not executed: no browser connection or authorized administrator fixture/session available |

The final full run used one worker with file parallelism disabled and completed in 157.28 seconds. No test timed out. The unchanged five-second per-test limit and existing assertions remain. Test-authoring TypeScript errors from an unsupported `exact` option on role queries were corrected by using the supported string-name matcher; checks were not relaxed. New files have no ESLint diagnostics. Local machine-readable test/lint evidence is retained under `.git/sprint6-checkpoint/`; these are local evidence files, not application dependencies.

The final build transformed 3,662 modules. Generated public SEO files have unchanged content. The bundle remains larger than the build warning threshold; no dependency update or warning suppression was performed.

The first full run finished **136 passed / 1 failed (137 tests, 26 files)**. The new administrator inspection test omitted the application's `HelmetProvider`, causing `HelmetDispatcher` to fail. Its wrapper was corrected to supply the real provider. No production change, timeout increase, skipped test or weakened assertion was used to address it. Further focused cases cover failed audit/dispute/property requests and an acknowledged review with notification transport failure.

All service responses in new tests are mocked; no live privileged operations or remote resources are changed. Existing route-guard regression cases continue to check unauthenticated and ordinary-user denial of admin content.

## Remaining acceptance and security work

- Capture and inspect overview, users, verification, moderation, inbox/thread, inspections, audit and deal tracking at every required width; verify keyboard/drawer focus, long content, phone keyboards, safe areas and screen-reader table/card behavior.
- Use separately approved ordinary/admin sessions and disposable fixtures to verify deployed RLS, role boundaries, actual review acknowledgement, private signed documents, messaging delivery/isolation, inspections and Realtime reconnects. No account roles were changed to make UI testing possible.
- Verify existing moderation/verification restrictions against deployed policy and trigger behavior; mocked client tests cannot prove them.
- Preserve separate authorization for tests that write records or upload files. Existing A1 approval is not blanket permission for administrator actions or other write groups.
- Keep financial workflows locked and resolve backend/business acceptance separately. Do not infer settlement from stored status or expose private evidence via public links.
- Existing repository lint debt remains a release concern. No dependency, lint-rule or TypeScript-check weakening is part of this sprint.

No SQL was executed, no backend resources or environment variables were changed, and no Edge Functions were deployed. No commit or push was performed. This is a local implementation milestone, not production sign-off.
