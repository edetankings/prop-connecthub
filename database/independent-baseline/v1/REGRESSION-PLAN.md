# Regression and release gates

Status: test specification only. No scenarios below have been executed against
PostgreSQL, Supabase, Auth, Storage, Realtime or external providers in this phase.
`offline-verification.json` covers source/parser checks only.

## Test environment and evidence

After explicit approval, install into a disposable Supabase environment, not the
old backend or the intended production project. Create generated test accounts
for buyer A, buyer B, agent A, agent B, an administrator and an unrelated user.
Use real Supabase-issued tokens. Keep service-role credentials server-side.
Never simulate passing API tests using the SQL Editor's owner privileges.

Run negative tests with anon, the affected user, another authenticated user and
an administrator. Test the service role only for the expected Edge operations.
Record HTTP status, returned rows, count/state changes and ledger/wallet deltas;
omit credentials and personal information from test reports. Roll back or reset
only this explicitly disposable environment after testing. A role-denial may be
an empty RLS result rather than an HTTP error; assert absence of writes/rows.

## Installation and history

- Run readiness SQL before installation; it reports unexpected objects without mutation.
- Verify approval gate, wrong-owner guard, ledger detection, storage-policy detection,
  pre-existing enum/function/table detection and transaction rollback on injected failure.
- Successful installation has exactly 30 public tables, six enums, expected object
  inventory, two private infrastructure tables, six buckets and three publication members.
- Only three public configuration seed records exist; bank fields are NULL,
  financial gates false and company balances zero. No Auth users/roles are seeded.
- A second installation refuses to overwrite the first. Historical 55 hashes and
  Drizzle journal match the recorded manifest before and after all checks.
- Verify actual catalog types, nullability, checks, FK actions and function signatures
  against the intended contract. The offline column check alone does not prove types.

## Authentication, profiles and roles

- Buyer/agent/builder signup creates exactly one profile with a distinct profile UUID
  linked to its Auth UUID. Missing or invalid type metadata defaults safely.
- Malicious metadata requesting admin, KYC, phone verification, financial state,
  trust score or another user's identifier grants no such authority.
- Ordinary users cannot INSERT a profile directly or change profile ID, Auth ID,
  referral code, inviter, parent/position, trust, KYC or verification flags.
- Changing one's phone clears phone verification. A successful backend OTP flow
  sets verification without granting clients direct OTP-table access.
- No public path can bootstrap an admin. Later approved owner bootstrap establishes
  one admin. An admin can assign another user a role; ordinary/self assignment fails.
- Login, logout, email confirmation and recovery work with destination settings.
  These are Auth integration checks, not provided merely by SQL schema installation.
- Verification approval runs one profile synchronization, one trust increment and
  one user notification. Re-verification does not award the trust increment again.
- Authorized backend updates pass invoker guards; normal API writes cannot imitate
  the trusted function/role context. Check behavior on the actual hosted role model.

## Public access and privacy

- Anonymous agent browsing returns only visible agent/builder display fields.
  Buyers, hidden profiles, phone, Auth IDs, referral fields, bank details and KYC
  do not appear in the public view or helper result.
- Direct anon SELECT on profiles and financial/account tables fails.
- Scoped deal/chat participant RPCs deny outsiders even when given valid IDs.
- Referral summary returns only the caller's invited profiles and approved fields.
- Profile lookups and relationship embeddings required by each page are reviewed;
  frontend compatibility changes in CORRECTIONS.md must pass before cutover.

## Listings and documents

- Eligible agents create drafts; unverified or inactive agents cannot submit a
  non-draft listing. Clients cannot create an already-approved listing.
- Owners cannot set is_verified, publish directly, transfer ownership, replace a
  generated code, or modify transactional listing states. Approved edits return to review.
- Admin review produces one notification. Approval/availability must not allow
  an invalid or zero-priced real payment; price constraints reject invalid amounts.
- Public queries exclude drafts, under-review, payment-pending and non-live listings.
- Concurrent creates produce distinct property/deal codes beyond six digits.
- Sale/rental classification is explicit before submission. Approving a rental
  as available retains rental commission and rented completion state; sale
  completion retains sale commission and sold state. Missing classification fails.
- Document metadata and uploads require owned object paths. An accepted buyer can
  read only that deal's authorized property documents; unrelated buyers cannot.
- Auth account deletion with financial history is restricted; do not run the old
  multi-call delete-user implementation as a retention test on real accounts.

## Referrals and subscriptions

- Before approval, all financial/activation calls fail and leave no partial rows,
  company changes, ledger events or consumed receipts.
- Check the approved rule's amount, units, commission incidence, direct recipient
  semantics, qualification and missing-upline disposition with the owner first.
- For the optional legacy candidate, a 7500 activation conserves exactly 7500:
  company share + wallet credits + held allocations. Direct and L1 matrix events
  coexist without uniqueness conflicts. All remaining levels are accounted for.
- Actual BFS depth and two-child placement remain correct under concurrent signup.
  Inviter differs from placement parent after spillover; neither is client-editable.
- Test active/inactive/no uplines, 15 levels, repeated requests, simultaneous
  activation attempts, receipt reuse across workflows and unique event keys.
- Repeating distribution for the same activation changes nothing. No new marker
  can appear without the corresponding valid subscription/evidence request.
- Expired-term activation increments version once; active-term renewals fail closed.
- Verification bonus remains disabled. Attempts to configure an unsupported bonus
  policy fail explicitly, with no partial payouts. Funded bonus behavior requires
  a separately reviewed implementation and tests before enablement.
- Holds stay held until an explicit release/forfeiture policy is implemented;
  never infer payout from the UI's activation message.

## Payments, disputes and withdrawals

- No buyer can bypass agent acceptance using initiate_secure_payment.
- Wrong agent/admin, wrong buyer, own-listing purchases, missing evidence and
  mismatched Auth/profile relationships fail without state changes.
- Race two accepts on the same property; at most one live transaction results.
- Evidence must exist in the private bucket under the buyer's path. One canonical
  verified external receipt reference cannot fund two transactions/subscriptions.
- Approval reserves exactly net seller funds; release removes exactly that escrow,
  credits one wallet event and one commission, and closes the listing/deal once.
- Repeated approval/release/refund attempts do not double-credit or double-debit.
- Open disputes block release. Dispute insertion resolves Auth participants into
  profile FKs. Resolution alone does not process a refund.
- Pre-release refund reverses exactly the reserved amount; insufficient escrow
  fails. Post-release refund is rejected pending a recovery policy.
- Concurrent withdrawals cannot exceed available balance. Creation reserves funds;
  rejection returns them once; payment consumes the reservation once. Direct table
  status/balance changes are denied even to browser-level administrators.
- Verify zero, negative, NULL, excessive, overflow and invalid-currency inputs.
- Race release/distribution/withdrawal/expiry and confirm conservation and correct
  retry behavior for serialization failures or deadlocks. Do not automatically retry
  external transfers; use provider idempotency and recorded references.
- A SQL receipt or paid label is not evidence that a bank transfer occurred. Test
  the future provider/manual reconciliation process separately.

## Messaging, deals and inspections

- Only participants/admin can read each thread, message or deal; outsiders cannot
  insert messages or fabricate accepted deals/transaction links.
- Buyers cannot redirect a chat to another agent/property. Thread activation is
  only the checked admin RPC; participants can directly update last_message_at only.
- Only message seen state is editable. IDs, participants, attachments, moderation
  state and content edits are rejected as documented. System/contact attachments
  cannot be forged; contact-filter false positives are reviewed before production.
- Message attachment paths are owned by the sender. A partner can read an exact
  referenced, nonblocked file, not every upload in the sender's account directory.
- One deal request causes one event and notification. Accepted/declined/cancelled
  states and payment stages cannot be arbitrarily rewritten by clients.
- Inspection insert binds the real property owner; RPCs reject wrong buyer/agent,
  invalid actions/dates, terminal resurrection and unauthorized reassignment.
- Reschedule accept/cancel and confirmed completion/no-show preserve both status
  columns and notify the appropriate counterpart once.

## Storage, Realtime and functions

- Verify four buckets are actually private, not merely protected by SELECT policies.
  Anonymous URL reads and cross-owner signed URL generation must fail.
- Public media remains publicly readable, but upload/update/delete is owner-scoped.
  Evidence cannot be replaced/deleted through ordinary client policies.
- Test MIME allowlists, inherited global size limits, path traversal attempts,
  filename handling, expired signed links and unsupported file formats.
- Realtime messages/threads/notifications deliver only authorized records. An
  unrelated token sees no private inserts/updates; no cross-account broadcasts leak.
- API clients cannot execute ensure_wallet, distribution, bonus, numbering,
  trigger/internal functions or access private receipt/history tables.
- Test phone OTP and AI with destination-generated credentials only after separate
  deployment approval. Check CORS/JWT validation, SMS limits, AI replacement and
  configuration failure handling. Never deploy admin-delete-user unchanged.

## Release decision

Target installation requires reviewed readiness results, explicit approval and a
passing disposable rehearsal. Production cutover additionally requires owner
business decisions, compatibility changes, real configuration, end-to-end tests,
monitoring and a destination backup/rollback procedure. No Lovable disconnection
is required or authorized by this package.
