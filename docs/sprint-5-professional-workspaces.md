# Sprint 5 — Agent and builder/developer workspaces

Status: implemented locally; rendered visual and live authenticated acceptance pending.

## Existing architecture and capability audit

Both professionals use `profiles.profile_type` (`agent` or `builder`) and own properties through **profile UUIDs** in `properties.agent_id`. The existing dashboard router and protected routes remain unchanged. Administrator privileges continue to come from the Auth provider's role check, not professional profile type.

Existing capabilities include property creation, multiple public property images and optional videos, private property-document metadata/uploads, owner property updates, draft deletion, chat-thread membership and participant RPCs, message subscriptions, identity review, personal profile settings, and inspection-response RPCs. The existing builder dashboard queried the same properties table; its “projects” wording did not establish a development-management system.

The schema has no construction phases, multi-unit inventory, development GDV, occupancy analytics, listing-view tracking, sales goals or independent lead-stage CRM. Reference-image metrics and progress charts were not copied as fabricated production data. Inquiries are actual authorized conversations. Financial modules and locks remain unchanged; the redesigned professional overview does not mount payment or withdrawal controls.

Source review confirmed the following constraints:

- RLS restricts non-admin property deletion to owned drafts.
- The property guard locks `payment_pending`, `transaction_in_progress`, `sold` and `rented` records, protects ownership/identity/approval fields, and sends changes to reviewed listings back through moderation.
- Professional submission requires existing KYC and active-subscription checks. The existing subscription hook includes both agents and builders. These gates were retained.
- `agent_respond_inspection` authorizes the owning property's professional Auth identity. Both professional profile categories can use the existing ownership-based workflow; no builder role assignment or new RPC was introduced.
- Property photography is in the existing public `property-images` bucket; documents remain in private `property-documents`. Actual configured image/video MIME types were reviewed in the unchanged baseline.

This is source-level verification, not proof of deployed RLS, storage, subscriptions or live RPC acceptance.

## Shared workspace and distinct roles

`WorkspaceShell` extracts the existing buyer foundation into one shared shell. The buyer wrapper retains its public component interface. `AuthenticatedLayout` selects the professional variant only for agent/builder profiles that are not administrators; the administrator layout remains in place.

The professional sidebar has distinct Agent/Developer labels, real account access, listing management, inquiries, messages and identity review. Desktop uses a persistent sidebar; smaller layouts use the existing accessible Radix drawer. Buyer navigation and sign-out behavior retain their regression tests. No duplicate dashboard routes were added: portfolio and inquiry views use `?view=listings` and `?view=inquiries` on the existing professional dashboard URLs. Builders access inspections through `?view=inspections`, reusing the same inspection component and RPC; the existing agent inspection URL remains supported.

`ProfessionalDashboard` provides role-specific headings, real listing counts, verified active counts, review-pending counts and requested-inspection counts. Failed/pending reads show unavailable values rather than fabricated zero activity. Resources have independent loading/error/empty states and retry. Counts describe returned records, not unrestricted server totals.

Property management includes real photos/fallbacks, naira prices, locations, actual statuses, search by title/location/property code, status filtering, preview, edit for unlocked records, and confirmed draft deletion. Delete predicates include ID, owner and draft status, and success requires an actual returned row. Locked properties have explanatory text and no edit/delete controls. Conversations use the existing participant RPC and real latest-message timestamps/previews; unread counts exclude the professional's own sent messages. No invented stages, online-presence badges or revenue graphs were added.

## Create/edit listing and photography

The existing `/add-property` route now supports `?edit=PROPERTY_ID`; no new editor route or parallel upload pipeline was introduced. Loading checks ID and ownership, rejects transaction-locked records, and verifies document metadata can be read before exposing the editor. Missing, inaccessible, other-owner or locked rows fail closed. A query-key change remounts editor state to avoid carrying a previous property's upload cache into another listing.

The form uses section navigation for photography, details, location, documents, amenities and review. Existing manual validation, KYC/subscription gates, map coordinates, category choices, PDF requirements, draft behavior and retry bookkeeping remain. There are no new mandatory business fields. Buyer profiles are not presented with professional listing controls.

Editing retains existing public image/video references and private document records. Users may remove an image reference or select a retained/new image as cover; saving puts the selected cover first in `images` and sets `image_url` accordingly. There is no arbitrary cross-group drag-ordering interface. Removing a reference does not delete its storage object. Retained videos/documents are preserved; a new existing-file deletion or signed-document viewer was not added.

New image previews, mobile-visible removal controls, descriptive cover labels and keyboard-accessible native file inputs reuse existing storage. Image/video selection now aligns with the unchanged bucket MIME configuration: JPEG/PNG/WebP and MP4/WebM. Unsupported MOV/GIF/SVG inputs are not advertised as supported uploads. Existing per-selection size/count limits for new videos/documents remain unchanged; retained references are preserved separately. No new collection-wide limit was invented.

Upload feedback reports actual stages and photograph indices, not invented byte percentages. Fields, file inputs and media controls are disabled during a pending save, and image drops are ignored until it finishes, preventing local edits from contradicting the in-flight snapshot. Existing acknowledged file uploads are reused after failures, and an acknowledged property ID prevents duplicate insertion when a document step fails. Retained document metadata satisfies the existing edit-time document requirement; a new listing still requires documents under the original rules.

Updates are filtered by ID and owner. Editing omits `is_verified`; it does not self-approve or alter ownership. A previously reviewed professional listing is submitted for moderation rather than misleadingly labelled a saved draft. The server's returned `status` determines draft/review/publication feedback. A successful request alone cannot display “published.” Failed updates to previously existing records also do not claim that a new save occurred; partial-save feedback requires an acknowledged write. Existing administrator creation behavior remains separate.

## Inspections, messaging and profiles

The existing inspection page is reused in professional layouts. Agent response actions keep the same RPC arguments and transitions, adding pending/error recovery, duplicate-action protection, associated dialog labels and an explanation that proposals require buyer acceptance. Terminal statuses remain authoritative; no automatic appointment availability or confirmation was added.

Inbox, thread and settings pages inherit the shared professional shell and responsive workspace foundation. Their existing membership filters, message composer, attachment restrictions, seen updates, subscriptions, profile/avatar updates, verification forms and password flow are retained. No new business-details fields, corporate verification status, professional self-approval or role editing was invented.

## Files

| File | Purpose |
| --- | --- |
| `src/components/WorkspaceShell.tsx` | Shared buyer/professional shell and role-aware navigation |
| `src/components/buyer/BuyerWorkspaceShell.tsx` | Compatible buyer wrapper around the shared shell |
| `src/components/AuthenticatedLayout.tsx` | Select the existing-role layout variant |
| `src/components/professional/ProfessionalDashboard.tsx` | Shared, role-specific professional data views and owned listing controls |
| `src/pages/AgentDashboard.tsx`, `src/pages/BuilderDashboard.tsx` | Existing route components using that shared implementation |
| `src/pages/AddProperty.tsx` | Existing create/upload pipeline with owned editing and guided presentation |
| `src/components/PdfUploader.tsx`, `src/components/VideoUploader.tsx` | Accessible selection/removal and supported MIME feedback |
| `src/pages/Inspections.tsx` | Existing professional response workflow presentation and error recovery |
| `src/styles/professional-workspace.css`, `src/index.css` | Scoped visual styling and responsive forms/cards/dialogs |
| `src/components/professional/ProfessionalDashboard.test.tsx` | Owned listing, inquiry, role and deletion tests |
| `src/pages/PropertyEditor.test.tsx` | Retention, cover selection, owner/lock checks and moderation tests |
| `src/pages/AddProperty.test.tsx` | Existing upload-retry tests updated to return the requested saved status and accept owner-scoped update chaining |
| `src/components/buyer/BuyerWorkspaceShell.test.tsx` | Existing buyer tests plus developer navigation coverage |

## Validation and timeout investigation

ESLint reports **308 errors and 26 warnings**, down from 332/29, with **no new diagnostic identities**. All **102 protected-file hashes** match the preceding checkpoint. Application and tooling TypeScript checks passed. The final production build passed, with the existing large-chunk and outdated Browserslist warnings. The final full run passed **121 tests in 23 files**, including **17 added regression cases**, with **zero failures and zero skipped/pending tests**. The original five-second per-test limit and all existing assertions remain in place. `git diff --check` passed; all **50 route declarations** remain. Tests use mocked SDK responses and synthetic identities only; no live property, document, inspection, message, profile or role mutation was executed.

The recurring homepage timeout was investigated with temporary step timings and heap reporting. The unchanged 14-section test passed in isolation in **1.229 seconds**, using about **65 MB** heap: initial render **419 ms**, data/section checks **342 ms**, role queries **428 ms**. Earlier full runs exceeded five seconds in different unchanged cases. This does not establish a root cause or excuse a failing full run. No timeout, assertion, retry setting or production behavior was weakened to force acceptance. Temporary profiling instrumentation was removed and the homepage test restored exactly. The first full run passed the homepage case in **1.252 seconds** and the marketplace search/filter case in **2.523 seconds**, with per-file heap reporting roughly **31–75 MB**, without sustained growth across files. The final run also passed both cases (homepage **1.245 seconds**, marketplace **2.532 seconds**) with roughly **30–78 MB** per-file heap reporting. The root cause of earlier variable timing is still unproven. Full-suite evidence is retained locally under `.git/sprint5-checkpoint/`.

The first TypeScript pass caught a duplicate accessibility attribute introduced while improving the PDF remove label; it was corrected. An initial focused test emitted an `act` warning for asynchronous empty-resource settling; that test now explicitly waits for React's asynchronous work.

All 102 protected files are compared with the preceding checkpoint. SQL history, Auth provider, route guards, Supabase configuration, credentials, storage/RLS policies, Edge Functions and financial safety settings must remain unchanged. No dependencies were added. Existing unrelated worktree changes, including the Sprint 4 report update, were preserved. No deployment, commit or push commands were run.

## Visual and live acceptance still required

Browser discovery returned no available connection. Screenshots and actual rendered checks remain **pending** at **320, 360, 375, 390, 430, 768, 1024 and 1440px** for agent overview, portfolio, create/edit form, inquiry/inspection views, developer overview and developer portfolio. Messaging and professional profile/verification surfaces also require rendered and authenticated acceptance.

Restore the existing Chrome connection by reinstalling the Browser plugin through the application plugin UI, then restarting the application and Chrome. The previously installed extension alone has not provided an available app-side connector. No manual registry or browser-profile repair was performed.

With an approved professional test session, inspect navigation focus/closing, native file input usability, cover/removal controls, long labels and prices, modal bounds, mobile keyboard/composer access and page overflow. Live create/edit/delete/upload/inspection tests need a separately approved disposable scope and must respect ownership, subscription, KYC, moderation and transaction locks. Financial operations remain locked.

Large portfolios and long conversation histories still require separately scoped server pagination/count work. Subscription availability and mail/Realtime delivery are not established by mock tests. The schema still has no construction/unit CRM capabilities. This sprint is not marked visually or live-functionally accepted.
