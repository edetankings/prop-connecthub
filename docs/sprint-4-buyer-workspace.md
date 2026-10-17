# Sprint 4 — Buyer workspace

Status: implemented locally; visual and live authenticated acceptance pending.

## Architecture discovered

The existing `/dashboard/buyer` route used one large dashboard, an authenticated layout with a drawer, and browser-only favorites under `prop-connect-favorites`. Saved count was hardcoded, several quick actions were decorative, search used unsupported city/budget parameters, recommendations displayed invented trust defaults, presence dots implied unsupported online tracking, and a verification activity event used the current time rather than a stored event timestamp.

Reservations use **profile UUIDs** in `buyer_id`; transaction records use the **Auth UUID**. Chat membership and message sender IDs use profile UUIDs; `get_chat_participants` provides permitted participant details. Existing inbox/thread subscriptions listen to `messages` and `chat_threads`, both included in the baseline Realtime publication. This is source-level confirmation, not a live connectivity test.

Buyer inspection RPCs already support accepting a proposed time and cancelling an active request. Agent response operations and the reservation guard remain authoritative. Profile settings already update name, phone, bio, location and avatar, and store notification preferences. A stored `two_factor_enabled` preference does not implement Auth factor enrollment.

## Pages and navigation

- Existing buyer overview now provides an actual profile welcome, functional discovery search, device-local save count, upcoming-request count, returned-conversation unread count, inspection previews, conversations and latest reviewed listings.
- `/dashboard/buyer?view=saved` reuses the same dashboard route for the saved collection. Existing cards provide details, messaging and save/remove actions. Missing or inaccessible records have a local remove action; malformed stored IDs are not sent to UUID queries.
- `/dashboard/buyer?view=transactions` is a read-only view of authorized records, with property context, stored payment status, amount and actual recorded dates. It has no financial action handlers and does not mount the existing actionable `SecureTransactions` component.
- The existing inspections route now uses the authenticated buyer layout. Status filters, requested/proposed times, notes, property links and agent messaging are preserved. Cancellation and proposal acceptance call the same existing RPC, with pending feedback and a duplicate-action guard. No direct status writes were added.
- The existing inbox keeps its participant RPC, last-message query, unread query, search/filter controls and subscriptions. It now distinguishes query failures from an empty inbox and supports retry. Unsupported permanent assistant-conversation and online-presence presentations were removed. Unknown participant types are not advertised as a System conversation category.
- The existing thread keeps permissions, restricted-thread behavior, contact filtering, attachments, composer, seen updates and subscriptions. Source updates add read-error feedback/retry and accessible composer labeling, remove unsupported online status and replace payment-unlock copy with the financial-lock explanation.
- Existing settings retain their profile/avatar update payloads, preference storage, password-recovery redirect and sign-out operation. Inputs now have associated labels, email verification reflects Auth data, membership dates do not default to today, and failures do not claim successful sign-out. The nonfunctional MFA switch was replaced by an explanation; no factors are enrolled or removed. Preference copy does not promise configured email or device-push delivery.

The existing `AuthenticatedLayout` selects a buyer-only visual variant for buyer profiles that are not administrators. This provides a persistent desktop sidebar and an accessible Radix mobile drawer. Other roles retain the previous layout and navigation. Saved and transaction views use query parameters; no routes or role definitions were added. Message navigation remains active on thread routes. Existing notification and theme infrastructure are reused.

## Real data and limitations

Favorites remain local to a browser/device and are **not account-bound or synchronized between devices**. Removing a save changes local storage only. Listing content is fetched again through the current Supabase client and its existing RLS rules.

No recently viewed tracking was added. Inspection activity uses actual reservation creation timestamps and explicitly labels inspection status as the current status, rather than inventing status-change history. Latest listings are described as marketplace listings, not personalized recommendations. No dummy residences, occupancy charts, success rates, agent presence, or transaction amounts from the reference image were copied into production content.

Resources have separate loading/error/empty states and retry. Dashboard reads ignore stale responses after loader scope changes. Inbox and inspection reads discard outdated requests. A failed read does not become a fabricated zero activity count. Counts summarize returned records; they do not bypass Supabase's response row limit or claim server-wide totals. Large inventories will require separately scoped pagination/count work. A very large local save collection may likewise require chunked retrieval beyond one response.

The current saved collection can include sold listings if RLS permits reading them; their actual status is displayed. Inaccessible rows remain removable local references, not claims that the property was deleted from the database.

Transaction screenshots/documents are not exposed through new raw links. This sprint does not add a document viewer or suggest that recorded payment statuses establish an operational escrow service. Existing financial surfaces and locks elsewhere are unchanged.

## Changed files

| File | Purpose |
| --- | --- |
| `src/pages/BuyerDashboard.tsx` | Real-data overview, saved collection and read-only transaction view |
| `src/components/buyer/BuyerWorkspaceShell.tsx` | Buyer layout variant, active navigation, mobile drawer and sign-out feedback |
| `src/components/AuthenticatedLayout.tsx` | Select buyer variant while retaining other role layouts |
| `src/components/buyer/ResourceState.tsx` | Shared loading, error/retry and empty feedback |
| `src/hooks/useBuyerResource.ts` | Cancellable presentation of existing read queries |
| `src/hooks/useLocalFavorites.ts` | Expose existing IDs and local-only remove behavior |
| `src/pages/Inspections.tsx` | Buyer workspace presentation, query feedback and existing permitted actions |
| `src/pages/ChatInbox.tsx` | Existing inbox presentation, truthful states and retry |
| `src/pages/Chat.tsx` | Thread presentation, read feedback, labeling and truthful copy |
| `src/pages/Settings.tsx` | Profile/account presentation, labels and safe error feedback |
| `src/components/NotificationBell.tsx` | Accessible bell name, expanded state and Escape dismissal |
| `src/styles/buyer-workspace.css`, `src/index.css` | Scoped workspace styles, responsive layouts and safe-area behavior |
| `src/pages/BuyerWorkspace.test.tsx` | Synthetic-data dashboard, favorites, inspections, transactions and inbox tests |
| `src/components/buyer/BuyerWorkspaceShell.test.tsx` | Navigation/drawer and sign-out regression tests |

## Safety and verification

No schema, migration, Supabase configuration, credentials, Auth provider, protected-route enforcement, role assignment, agent/admin RPC, financial RPC or Edge Function was modified. The 102 protected files are checked against the preceding checkpoint. No dependencies were added. No live SQL, transaction, message, inspection mutation, profile update, upload or sign-out was executed during verification; tests use synthetic identities and mocked SDK responses only. Existing unrelated worktree changes were preserved. No deployment, commit or push commands were run in this work. A separate commit (`91299d0`, `ui 2.0 on prop-connect design`) appeared in the repository while verification was running; that state was preserved.

Application and tooling TypeScript checks passed. The production build passed, with the existing large-bundle and outdated Browserslist warnings. ESLint reports **332 existing errors / 29 warnings**, compared with Sprint 3’s 353/31; diagnostic-identity comparison found **no additions**. All **102 protected files** matched their hashes, and `git diff --check` passed. The full-suite repeat finished **103 passed / 1 failed (104 total, 21 files)**. All **10 new Sprint 4 tests passed**. The remaining failure was the existing homepage 14-section test exceeding its unchanged five-second timeout. The marketplace test that timed out during the first run passed during the repeat. The homepage file then passed all **3 tests in isolation**, with the previously timed-out case finishing in 1.887 seconds. This does not turn the earlier full-suite run into a passing run; the intermittent timing issue remains documented. No assertions or timeouts were weakened; the suite is not reported as fully passing. Initial testing passed the seven focused buyer data/interaction tests. An early full-suite run hit the unchanged five-second limit in an existing marketplace test while TypeScript was running; that timeout is recorded rather than concealed. Final checks run without concurrent build workload.

## Visual/live acceptance

Browser discovery returned no available connection. The installed Chrome extension has previously been detected, but its app-side native connector is unavailable. Restore it by reinstalling the Browser plugin through the application plugin UI and restarting the application and Chrome. No manual browser-profile or registry changes were made.

All rendered checks remain pending at **320, 360, 375, 390, 430, 768, 1024 and 1440px**. Required captures: overview, saved properties, inspections, inbox/thread, profile/settings. Inspect drawer keyboard navigation and dismissal, card cropping and long text, sidebar scrolling, notification panel bounds, composer access with the mobile keyboard, safe areas, and absence of page overflow or overlapping controls. CSS/DOM checks are not screenshot evidence.

With an approved buyer session and owner-controlled test account, verify live personal reads and local-save removal. Any live inspection response, message send, profile edit, upload or logout must remain within the separately approved test scope. Financial operations must remain locked. This sprint is not marked visually or live-functionally accepted.
