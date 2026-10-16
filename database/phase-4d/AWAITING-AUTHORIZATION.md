# Phase 4D pending actor and fixture tests

The supplied request ends at Stage 6, “Inspect”. The owner declined to provide
additional text. This plan covers the supplied scope and does not invent later
stages or authorize changes to the database or security configuration.

No connected browser was available. Do not extract cookies, tokens, localStorage
or browser profiles to work around this. Supabase CLI login is an administrative
tool session, not a buyer/agent/builder application session. No service-role key
was used to simulate a user.

## Existing account: browser participation needed, no new account required

Use the existing account privately in the local application. Never send passwords,
tokens, recovery links or login codes through chat or store them in test reports.
Before testing, confirm browser network requests use only the verified independent
backend `prtrpywkwmnpowrthppg.supabase.co`. SEO links to the existing public website
origin are distinct from backend API connections.

| Test | Exact action and expected result | Current status |
| --- | --- | --- |
| Login | Submit the existing account credentials privately; correct credentials succeed, incorrect credentials show an error without a success message | Browser session unavailable |
| Persistence/refresh | Reload after login; own identity/profile and role navigation remain correct | Browser session unavailable |
| Logout | Sign out; navigate directly to a protected URL; redirects to login and stale profile/admin state does not return | Browser session unavailable |
| Admin route | With the ordinary account, navigate to `/admin`; deny access and never render admin data | Browser session unavailable; mocked route test prepared |
| Profile UUID mapping | Own profile lookup uses Auth UUID in user_id; profile ID identifies agent/chat relationships | Aggregate live mapping passed; signed-in UI pending |
| Refresh failure/expiry | In a controlled browser test, simulate a failed refresh without exposing/reusing tokens; protected UI returns to login or a clear error | Browser test required; no real sessions revoked |
| Password recovery | Only after owner approval to send a recovery email and change the existing account password, request recovery; verify invalid/expired link handling and new-password login | Not attempted; account-impacting action requires owner participation |
| Registration/confirmation | Owner already reports registration, email confirmation and profile creation passed | Owner-reported, not independently rerun |

## Additional accounts and writes: awaiting explicit authorization

The database currently has one account/profile and no administrator role. The
following tests must not run merely because a catalog check passes. Obtain an
explicitly approved fixture/cleanup plan first. No accounts, listings, subscriptions,
messages, reservations or files were created by this audit.

| Area | Minimal approved fixture and checks |
| --- | --- |
| Role isolation | Two existing or explicitly approved test accounts with different ownership; buyer, agent and builder contexts as needed. Unrelated profile/KYC/chat/document reads must fail; each user sees only own permitted rows |
| Privileged fields | In an approved write test, try self-admin role insert, KYC approval, trust/verification changes and property approval. Expect denial and verify every protected field remains unchanged |
| Financial protection | Approved negative mutation tests against synthetic records only. Confirm wallets, earnings, transactions and subscriptions reject direct client changes. Do not enable gates, add balances, activate subscriptions or execute successful money workflows |
| Listings | Owner-approved synthetic draft(s) owned by distinct test identities. Verify editing, ownership, sale/rental persistence and cross-user denial. Publication can remain blocked by the subscription gate; do not bypass it |
| Public discovery | At least one approved public fixture and one pending/unapproved fixture, supplied without bypassing financial/approval rules. Verify search, filtering, detail pages, images and absence of non-public records |
| Private files | Explicit permission for synthetic JPEG/PNG/WebP/PDF/audio fixtures only. Test correct UUID folders, wrong-owner access, MIME rejection, inherited size limit, signed-link expiry and denied anonymous/private downloads. Never upload real IDs or payment evidence |
| Messaging | Authorized buyer-started thread, unrelated third account and synthetic messages/attachments. Verify sender/participant immutability, blocked-contact handling, denied unrelated reads and signed attachment scope |
| Reservations | Approved property/participant fixtures; test request and checked response RPCs, correct actors, duplicate/terminal states and failed-transition UI messages |
| Realtime | With permitted fixtures/sessions, verify messages/threads/notifications deliver only to authorized actors; publication membership alone is not a runtime test |
| Administrator actions | Postponed. Do not create/bootstrap an administrator for this audit; await separately approved owner process |

All six storage buckets currently contain zero objects. Positive download, upload,
signed URL and cross-user file tests therefore remain unexecuted. Per-bucket size
limits are NULL, meaning the project/global limit must be reviewed separately in
Storage settings; no project-wide size value was inferred from that NULL.

## Static frontend findings requiring follow-up

1. `AddProperty.tsx`: PDF/image/video upload failures can be toasted and skipped,
   allowing the save flow to continue and later report success. Test failure/retry
   behavior and correct it before release; a multi-request upload is not atomic.
2. `ResetPassword.tsx`: a URL fragment with `type=recovery` enables the form before
   a real session is confirmed. Supabase still authorizes updateUser, so this is
   not evidence of a password-reset bypass; fix/test the misleading form state.
3. `PropertyDetail.tsx`: static mock fallback can render a demo property when no
   corresponding live row is returned. Review whether demo fixtures should be
   disabled in the independent live marketplace. No actual unapproved row exposure
   was demonstrated by this source finding.

No application behavior or database policy was changed to hide these findings.
