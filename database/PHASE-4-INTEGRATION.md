# Phase 4 independent Supabase integration

Status: local integration preparation. The owner reports the independent baseline
installed and structural validation completed. No destination access, credential
change, deployment, administrator creation, SQL execution or traffic switch was
performed during Phase 4. Functional readiness is not established by a build.

## Connection and Auth

The browser uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
`VITE_SUPABASE_PROJECT_ID` is unnecessary for frontend initialization. Configuration
validation rejects missing values, credential-bearing/non-origin URLs, remote HTTP,
server secret keys and legacy JWT keys whose role is not `anon`. This validation
does not authenticate the public key or prove it belongs to the supplied URL.

`client.ts` uses standard Supabase browser storage, session persistence, refresh
and URL session detection. The preview postMessage session broker is removed.
Registration accepts buyer/agent/builder metadata only; the database remains
authoritative for roles and profile creation. Auth UUIDs select `profiles.user_id`;
profile UUIDs identify chat participants, listing agents and reservations. Logout
errors are surfaced; delayed profile responses cannot restore a logged-out user.
The existing password-reset route remains `/reset-password`.

Owner setup for an isolated local integration run:

1. Privately obtain the independent project's HTTPS URL and **public publishable
   key** from its dashboard. Do not supply database passwords, service-role keys,
   secret keys or provider secrets to the frontend or chat.
2. Create `.env.local` from `.env.example`, populate only those public values and
   restart Vite. Existing `.env` is untouched and may still identify the old backend.
   Do not copy deployment settings or automatically switch production traffic.
3. Verify the request host in browser network tools before creating test accounts.
   Old project sessions and testing accounts are not migrated. A new project will
   require new test registrations.
4. In independent Auth URL Configuration set Site URL to the chosen testing origin
   while testing. Allow that exact origin and its `/reset-password` redirect URL.
   Local Vite uses `http://localhost:8080`; add the 127.0.0.1 variant only if used.
   Add reviewed production URLs later. Avoid broad production redirect wildcards.
5. Enable email/password login and email confirmation. Configure approved SMTP,
   sender identity and delivery limits before testing with arbitrary recipients;
   default provider restrictions can prevent delivery. Test signup confirmation,
   login, reload persistence, refresh, logout and password recovery end-to-end.
6. No administrator is seeded or selectable at signup. Owner administrator
   bootstrap requires a separately approved trusted process after registering and
   verifying the intended account. Never grant a role through browser metadata.

`.env` was already tracked in Git. New ignore rules do not untrack it. Preserve the
local file, exclude it from future publication and arrange a separate index-only
cleanup before any later commit. No index changes were made in this phase.

## Baseline compatibility changes

| Area | Prepared behavior |
| --- | --- |
| Types | Offline contract derived from the ten reviewed baseline SQL files; all 30 tables, six enums, public functions, public-directory projection and public FK metadata represented |
| Public directory | Excludes private Auth/referral fields; PropertyDetail reads the public projection |
| Deals and chat names | Scoped `get_deal_participants` and `get_chat_participants` replace public Auth-ID/buyer lookups |
| Referrals | Invited-user list uses `get_referral_summary`; full matrix inspection remains admin-only under current RLS |
| Matrix | Removed incorrect fixed level-one filters; corrected binary-tree capacity labels; no client privacy bypass |
| Listings | Explicit sale/rental `listing_type` survives review/approval/payment; discovery, cards and payment calculations use it |
| Private documents | Store owned relative paths; signed URL helper rejects absolute/legacy public URLs |
| Withdrawals | `request_withdrawal`, `approve_withdrawal`, `reject_withdrawal`; available balance comes from the wallet, not reconstructed earnings |
| Subscriptions | Checked activation/rejection RPCs; activation requires owner-supplied end date and verified provider reference, never an invented billing duration |
| Listing payments | Approval requires a verified provider reference; invalid Auth-user email joins removed |
| Financial UI | No placeholder bank account; payment collection/withdrawal entry points fail closed when gated bank details are unavailable |
| Accounting display | Avoids duplicate sale payouts in earnings charts and the builder wallet's incorrect divide-by-100 conversion for the NGN-major baseline candidate |
| Reservations | Agent/admin responses use inspection RPCs and check errors before reporting success |
| Chat | Activation uses admin-only RPC; no client-forged system/contact messages or false success after a rejected activation/message |
| KYC | Review submission status; canonical database triggers own profile synchronization, trust increments and review notifications |
| Verification steps | No browser writes of privileged approved statuses; verified email/phone are displayed from trusted Auth/profile state |
| Analytics | Admin route, removed from public sitemap; no privacy expansion to support public operational counts |

### Phase 4C: live types generated

`src/integrations/supabase/types.ts` is now generated from the confirmed independent
project `prtrpywkwmnpowrthppg`, using the owner's authenticated Supabase CLI.
The public contract matches the baseline: 30 tables, six enums, one view, 37 public
non-trigger functions and 31 public-schema FK relationships. See
[Phase 4C results](PHASE-4C-RESULTS.md) for validation and scope limits.

The generation script uses `npx --yes supabase`, not a global executable. To
regenerate read-only against this same explicitly confirmed target:

```powershell
./scripts/generate-supabase-types.ps1 -ProjectRef prtrpywkwmnpowrthppg
```

Never infer the target from the old `supabase/config.toml`. Do not link projects,
run migrations or use a different reference without verifying it. CLI login is
interactive and private; never store its credentials in project files. The script
checks command success and baseline markers before replacing the type file.

The offline generator was used during preparation only. **Do not run
`scripts/generate-baseline-types.py` over the live-generated type file.** Preserve
live introspection as the application contract; baseline comparisons remain offline.
The earlier Phase 4 report is a historical snapshot, superseded here for type
provenance and owner-reported registration/confirmation/profile tests.

## Storage

| Bucket | Access | Integration |
| --- | --- | --- |
| avatars | Public | Auth UUID folder; public display URL; JPEG/PNG/WebP |
| property-images | Public | Auth UUID folder; public listing media; image/video MIME allowlist |
| verification-docs | Private | Relative owned path; signed preview; owner/admin policies |
| payment-screenshots | Private | Immutable evidence uploads; relative path; authorized signed receipt access |
| property-documents | Private | Relative owned path plus property metadata; signed access subject to accepted-deal/owner/admin authorization |
| chat-attachments | Private | Relative owned path; signed media under thread and exact attachment-path policies |

Only avatars and property-images use `getPublicUrl`. Storage/RLS is authoritative;
client path checks alone are not authorization. Existing upload controls and
baseline MIME allowlists still require real browser/API testing, including denied
access, cross-user paths, expired links and destination global upload limits.
No files or buckets were copied or modified remotely.

## Edge Function preparation

| Function | Prepared source and deployment gate |
| --- | --- |
| prop-ai | Preserves authenticated role-aware assistance and RLS-scoped listing search; removes hardcoded provider/model and old API key; disabled unless owner configures and enables an approved provider |
| admin-delete-user | Verifies caller and admin role; returns 409 without destructive cleanup until retention/transactional deletion design is approved |
| send-phone-otp | Authenticated existing Twilio flow; disabled by default; cryptographic OTP generation and sanitized provider errors; per-request CORS |
| verify-phone-otp | Authenticated account-scoped lookup; atomically reserves each attempt and consumes successful challenge before profile update; disabled by default; per-request CORS |

No functions were deployed. Independent deployments need an explicitly verified
project target and separate authorization. Source changes do not change the old
deployed functions or Lovable resources.

Server configuration names only:

- Platform-provided Supabase URL, anon/public API key and service-role credentials,
  used only within functions as appropriate. Verify managed credentials and Auth
  JWT settings for the new project before deployment; never put privileged keys in Vite.
- `ALLOWED_ORIGINS`: comma-separated exact approved HTTPS frontend origins. Local
  localhost/127.0.0.1 development origins are supported. Provider wildcards removed.
- `AI_ENABLED` defaults disabled; `AI_CHAT_COMPLETIONS_URL`, `AI_MODEL`, `AI_API_KEY`
  are supplied only after owner approval. The adapter supports an HTTPS,
  chat-completions-compatible streaming API. Other protocols need an adapter.
  No provider, model, payment plan or paid usage has been selected or activated.
- `OTP_ENABLED` defaults disabled; `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_FROM_NUMBER` remain server-only existing provider configuration.

AI still needs provider-specific quota/rate limiting, data-processing review and
streaming/error tests before enabling. OTP send throttling is currently a read/check
flow: concurrent sends and cost controls need a transactional rate-limit design
or approved provider verification service before enabling. Challenge consumption
and profile/step writes span requests, so a later write failure requires a new OTP;
this is not a claim of fully transactional verification. No database security was
weakened to address these limitations. Deno runtime checks require Deno tooling.

## Financial and administrative gates

All baseline flags, NULL bank fields, zero seed balances, commission settings and
disabled bonus policies remain unchanged. A UI availability check never grants
financial permission; checked RPCs and RLS still enforce authorization. No money
was moved, minted, credited or approved. Payment evidence submission is not proof
of settlement, and recording a withdrawal reference does not perform a transfer.

The 7500 candidate distribution, currency units, term duration, renewals, bonus
funding, holds, refund recovery and upload/retention decisions in baseline
`CORRECTIONS.md` remain owner decisions. Full member matrix visibility and
administrator-initiated conversations with buyer-only profiles have no safe broad
public-profile replacement: current access remains restricted and a narrowly
authorized RPC/design is required if those features must expand.

## Required live validation and next phase

1. Privately configure the independent URL/public key for local testing and
   regenerate destination types through authorized introspection.
2. Configure Auth redirects, confirmation delivery and SMTP; register disposable
   buyer, agent and builder accounts; verify one profile per Auth UUID.
3. Separately approve trusted administrator bootstrap. Test denied self-assignment
   and cross-user reads/writes with ordinary sessions, not service-role bypasses.
4. Test draft creation, listing_type persistence, KYC review, listing restrictions,
   private document uploads and signed access. Financial/subscription gates may
   intentionally block publishing/payment progression; do not fabricate an active
   subscription or relax the database guard to bypass that gate.
5. Test messaging, restrictions, inspections, notifications, support, announcements,
   referrals and Realtime using permitted actors. Reconcile embedded relationship
   results with the installed catalog; scoped RLS can omit display-only author names.
6. Resolve Edge service and retention decisions, review prepared functions, then
   obtain separate deployment authorization. Test denied calls and provider failures
   before enabling services. No deployed functionality is claimed here.
7. Keep production on its existing target until these tests pass and cutover is
   separately authorized. Keep the old backend intact.

Validation commands and actual outcomes are recorded in `PHASE-4-RESULTS.md`.

References: [Supabase type generation](https://supabase.com/docs/guides/api/rest/generating-types),
[API key types](https://supabase.com/docs/guides/getting-started/api-keys),
[Auth redirects](https://supabase.com/docs/guides/auth/redirect-urls),
[password authentication](https://supabase.com/docs/guides/auth/passwords).
