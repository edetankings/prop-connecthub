# PROP-CONNECT admin portal: feature and UX audit

Reviewed 26 October 2026. Scope: repository routes, active administrator shell,
page components, action handlers, and focused mocked tests. This is a source and
interaction audit, not a fresh live-data or production-security assessment.
The owner previously confirmed subscription OFF and ON saves in an admin session.
No application behavior, backend settings, or production deployment is changed by
this design proposal. Mockup numbers and names are illustrative.

## Feature inventory

| Area | Current implementation | Limits that the design must reflect |
| --- | --- | --- |
| Overview | `/admin` and `/admin/overview`; nine summary counts covering profiles, profile categories, properties, reviews, inspections, and payment review records | Two entry points for essentially the same summary. A record count is not settled revenue. |
| User directory | `/admin?view=users`; search by name/location, category and KYC filters, profile details, verification shortcut, messaging, public agent-directory visibility | Visibility is not account suspension. No role assignment or deletion action in the current directory. |
| KYC review | `/admin?view=verification`; submissions, steps, private documents, approve/reject, rejection reasons, confirmation dialog | Overall KYC, individual steps, and document decisions are distinct operations. |
| Property moderation | `/admin?view=moderation`; listing review, property documents, approve and return to draft | Returning to draft does not persist a property rejection reason; the UI must not imply otherwise. |
| Property monitoring | `/admin/properties`; status tabs, local search, listing cards, link to moderation | At most 200 returned records per selected status; this is not a complete server-side search. |
| Inspections / reservations | `/admin/inspections` and embedded Reservations tab; status filtering and inspection details | Administrator view is observational; agents handle scheduling responses. |
| Deal records / active deals | `/admin/deals` and embedded Active Deals tab; stage filtering, property details, links to deal activity | Read-only tracking; transaction completion remains gated. |
| Support | `/admin?view=support`; support messages, mark read, deletion | No supported reply composer is present in this tab. |
| Platform announcements | `/admin?view=announcements`; create, edit, delete, title, body, type | In-app announcements are separate from waitlist emails. |
| Subscription requirement | `/admin/feature-management`; persisted administrator-only ON/OFF control with acknowledgement and error feedback | OFF permits KYC-verified agents/builders to list without a subscription; existing paid terms remain intact. This switch does not unlock payments. |
| Subscription records | `/admin?view=subscriptions`; evidence, pending requests, approve/reject handlers | Approval depends on finance configuration, payment reference, and explicit expiry. The top tab row hides this tab; the feature-management page supplies a link. |
| Waitlist | Feature-management placeholder with disabled ON switch and unavailable records | Backend membership/management is not configured. A checked switch must not imply that waitlist registration works. |
| Waitlist email design | Subject, preheader, body, optional button, color theme, desktop/phone preview, HTML download | Sending is disabled; drafts live only in the current tab. Resend/server integration is not connected. |
| Disputes | Embedded tab and `/admin/disputes`; statuses, details, non-financial resolution with reason | A review resolution does not transfer or refund money. |
| Secure payments | `/admin/secure-payments`; transaction statuses, receipts, trace, approve/reject, release/refund handlers, expiry action | Financial actions are configuration-gated. Record management must be distinguished from enabled settlement operations. |
| Withdrawals | `/admin/withdrawals` and embedded implementation; pending/paid/rejected records, payout reference and rejection note | Mark Paid depends on financial availability. |
| Earnings / matrix / referrals | Matrix Overview and Referral Trees tabs, distribution/earnings views and referral trees | Earnings tab is hidden from the main tab list. Recorded allocation data does not establish that payouts are enabled. |
| Audit log | `/admin/audit` searchable latest 500 entries; embedded latest 50 entries | Search covers the returned slice; no complete-history search or export is provided. |
| Analytics | Admin-protected `/analytics`; users, properties, messaging, trends and financial aggregates | Separate public-style Navbar shell. Several failed count queries fall back to zero. Not the same as the operational overview. |
| Shared tools | Notifications, personal messages, theme switch, account settings, mobile navigation drawer | Personal messaging is not a platform-wide support inbox. AI availability depends on separate backend configuration. |

## Prioritized UX findings

1. **High: navigation fragments one workspace.** The active admin sidebar has ten
   destinations, while the Operations console adds twelve visible section tabs.
   Support, Announcements, Matrix Overview, and Referral Trees depend on those
   inner tabs. Other routed views are absent from the active sidebar. Use one
   grouped, stable navigation and retain local tabs only for filters within a task.
   Sources: `src/components/WorkspaceShell.tsx:27`,
   `src/pages/AdminDashboard.tsx:370`, `src/App.tsx:119`.
2. **High: URL state and tab state disagree.** Clicking an Operations tab calls
   `setTab` without updating `?view=`. Reloads, browser history, copied links, and
   sidebar highlighting can point to another section. Make the route authoritative.
   Source: `src/pages/AdminDashboard.tsx:408`.
3. **High: one failed request can blank unrelated admin work.** The console loads
   many datasets before showing the selected section. An error in an unrelated
   finance or support request produces a page-wide failure. Load by section and
   give panels independent loading, empty, error, and retry states.
   Source: `src/pages/AdminDashboard.tsx:131`.
4. **High: availability language is inconsistent.** The waitlist placeholder looks
   checked ON; the shell/overview hardcode finance-lock notices, while finance pages
   derive availability dynamically. Subscription activation can look clickable
   before its handler reports that payments are unavailable. Show a single accurate
   availability summary and distinguish subscription requirements from payments.
   Sources: `src/pages/AdminFeatureManagement.tsx:8`,
   `src/components/WorkspaceShell.tsx:68`,
   `src/components/admin/OperationsOverview.tsx:42`,
   `src/pages/AdminDashboard.tsx:1532`.
5. **Medium: dashboards emphasize totals rather than decisions.** Nine equal-weight
   metrics do not distinguish urgent review work from profile categories. Prioritize
   properties awaiting review, pending KYC, and requested inspections. Move category
   totals into a secondary breakdown. A unified attention queue is a proposed view
   built from existing records, not a current implemented feature.
6. **Medium: secondary views can confuse missing data with zero activity.** Secure
   payment loading ignores its query error; withdrawals toast an error but have no
   dedicated error panel; analytics substitutes zero for several failed counts.
   Keep unknown, empty, and zero visually distinct. Sources:
   `src/pages/AdminSecurePayments.tsx:39`, `src/pages/AdminWithdrawals.tsx:20`,
   `src/pages/Analytics.tsx:67`.
7. **Medium: high-consequence actions use mixed interactions.** Core moderation uses
   confirmation dialogs, while subscription approval uses native prompts for reference
   and expiry, and rejection calls its required reason optional. Standardize on
   accessible dialogs with inline validation, explicit result feedback, and duplicate
   submission protection. Source: `src/pages/AdminDashboard.tsx:322`.
8. **Medium: duplicated views increase inconsistency.** Overviews, audits, disputes,
   inspection/reservation views, and deal tracking appear in both standalone and
   embedded forms. Choose one canonical view per task and reuse its content.
9. **Medium: limits and destructive actions need clearer framing.** Keep 200/500-row
   scope labels visible, add pagination before implying full history, and confirm
   support-message deletion. Preserve KYC privacy and restrict document previews to
   authorized signed URLs.

## Proposed information architecture

- **Workspace:** Overview; Users; KYC reviews; Properties; Inspections; Deal records.
- **Communications:** Support inbox; Announcements; My messages.
- **Business:** Subscriptions; Referrals & matrix; Finance records; Disputes.
- **Administration:** Audit log; Platform settings; Account settings.

Finance records should group payment, withdrawal, and earnings records behind
appropriate availability messaging. Platform settings should distinguish the working
subscription requirement from unconfigured waitlist registration and email sending.
These groupings are proposals, not new working routes.

## UI direction and interaction specification

Use a forest-green sidebar, warm off-white canvas, white surfaces, mint success
states, amber pending states, and muted gold brand accents. Avoid decorative
revenue figures and unsupported system-health claims.

- Desktop: 240px sidebar, 72px topbar, 12-column content grid, 24px gutters.
- Typography: 28–32px page title, 18px section title, 14px primary text, 12px metadata.
- Spacing: 8px base scale; 14px card radius; subtle borders and restrained shadows.
- Overview: four priority metrics; a dominant review queue; smaller platform-status
  card; recent audit actions and support requests below.
- Tables: clear search scope, status filters, submission time, explicit Review
  actions, pagination, and contextual details rather than many competing buttons.
- Settings: show the last server-confirmed value, saving state, success, and a useful
  failure reason. Never show successful persistence before the server acknowledges it.
- Accessibility: named controls, visible keyboard focus, text with status colors,
  44px interaction targets, logical headings, and accessible confirmation dialogs.
- Mobile: collapsible grouped navigation, stacked summary cards, readable records,
  and a full-screen detail view instead of squeezed desktop tables.

## Visual sample brief

Generate one high-fidelity desktop Overview sample using the proposed grouped
navigation. Emphasize real review workflows, a subscription requirement status,
unconfigured waitlist/email, and unavailable payments. Mark every displayed metric
and record as sample data. The image is a proposal and does not change the app.
