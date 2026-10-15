# Corrections and compatibility contract

Every historical file maps to its replacement and disposition in
`historical-manifest.json`. Original files are not patched, renamed, moved or run.

## Identity and integrity

- Retain separate Auth and profile UUIDs. Dispute reporter/reported foreign keys
  remain profile-based for existing relationship queries; the dispute RPC resolves
  transaction-party Auth IDs to profiles before insertion.
- Add explicit foreign keys to account, transaction, subscription, reviewer,
  document, deal and actor references. Financial history uses restrictive deletes.
- Keep every historical frontend column. Additional bookkeeping fields are in
  `expected-objects.json`; regenerate database types after a later installation.
- Earnings now have distinct `transaction_id` and `subscription_id` foreign keys.
  The old polymorphic transaction ID and conflicting beneficiary-only uniqueness
  are removed. A non-NULL unique event key identifies source, activation version,
  event kind, level and beneficiary context. All used earning types are accepted.
- Matrix placement is serialized with a transaction advisory lock and unique
  parent/slot index. BFS depth is tracked accurately. Inviter and placement parent
  are stored separately; placement is immutable to clients and normal updates.
- Property/deal numbering uses sequences instead of COUNT+1 and does not truncate
  growing counters. Historical backfills and financial reprocessing loops are omitted.
- Add explicit `properties.listing_type` (sale/rental) before non-draft submission.
  Review/payment statuses no longer erase rental classification. Commission and
  transaction type use this persistent field, not an ambiguous `available` status.
  No sale/rental value is silently inferred for a new listing.

## Money and idempotency

- Pending owner decisions are explicit configuration gates, closed by default.
  Bank fields are NULL; the all-zero legacy account is also rejected by the gate.
- Approval requires private object-path evidence and an external canonical payment
  reference. A private receipt registry prevents reuse across listing payments,
  subscription activations and withdrawals. This is internal bookkeeping, not bank
  verification or an automated payment integration. Provider-namespaced references
  must be verified and normalized by the administrator/provider integration.
- Transaction state equals payment state; positive amounts, nonnegative balances,
  commission bounds, distinct parties and one live transaction per property are checked.
- Payment approval, release and refund lock the transaction. Release moves
  reserved escrow into one idempotent earning/wallet credit. Missing escrow raises
  an error instead of clamping balances and creating money. Company/wallet lock
  ordering is consistent in release and subscription distribution.
- Subscription activation locks its evidence request, consumes it once, uses a new
  activation version, and distributes once per version. Direct and matrix credits
  cannot collide. Eligible credits increase available wallets exactly once;
  ineligible allocations create unique holds. The approved candidate conserves 7500.
- Withdrawals must use a reservation RPC: available balance is reduced and
  `withdrawal_reserved` increased atomically. Payment consumes the reservation;
  rejection returns it once. Direct table writes cannot bypass the reservation.
- Under-review payments cannot be relabeled as refunds; rejected/unpaid cases use
  rejection. Only secured pre-release refunds are implemented. Open disputes block
  release. A resolved dispute is not proof of a financial refund.
- Historical transaction referral reward logic stays retired. Unfunded verification
  bonuses and undefined hold-release/forfeiture logic are deliberately not activated.

## Authorization and triggers

- Explicit grants follow object creation. No anonymous table writes, unrestricted
  money-table writes, client OTP reads, or client execution of internal money helpers.
- Signup validates profile type, creates one profile and never trusts roles/KYC
  metadata. Roles can be assigned by an existing administrator, not self-assigned.
- Full profiles are own/admin only. `public_profiles` exposes a fixed projection of
  visible agent/builder display attributes, omitting phone, Auth IDs and referrals.
  An explicitly bounded SECURITY DEFINER row function feeds an invoker/barrier view;
  it does not grant public access to the base table. Scoped participant/referral
  RPCs supply private-context lookups instead of widening the public projection.
- All functions use a fixed trusted search_path. Clients cannot CREATE objects in
  public/private schemas. Invoker field guards recognize checked definer RPCs and
  trusted backend roles; direct browser updates remain constrained by grants/RLS.
- One canonical trigger per behavior removes duplicate KYC/property/announcement
  notifications, trust increments and timestamps. Trust's verification increment
  is awarded once ever using a protected flag, even after re-verification.
- Property owners cannot approve listings, change owner/code, or bypass transactional
  state. Published edits return to review; verified/subscribed agent eligibility is
  checked on non-draft submissions. Payment states belong to RPCs.
- KYC owners cannot set review decisions. Trusted review synchronizes profile KYC.
  Owner resubmission clears stale review fields. Phone verification comes from the
  profile/backend, not a browser assertion. Verification-step/document review fields
  are protected separately.
- Chat participants and message ownership are immutable. Direct thread UPDATE is
  limited to last_message_at. Activation is an admin RPC. Message UPDATE is limited
  to seen; editing is disabled pending an audited moderation/edit-history rule.
  Conservative contact detection sets the blocked flag; this is not complete DLP.
  Reserved system/contact attachment kinds cannot be forged by normal message inserts.
- Deals and inspection responses are checked RPC operations with explicit transitions.
  Payment initiation returns the accepted deal's transaction; it cannot bypass agent
  acceptance. Event history and notifications are emitted once per action.

## Storage and Realtime

- Explicitly create all six buckets, including missing chat-attachments. Only
  property-images and avatars are public. Four evidence/document/chat buckets are private.
- Upload paths begin with the authenticated account UUID. Evidence cannot be replaced
  or deleted through client policies after upload. Public-media operations are scoped.
- Property document metadata must use owned relative paths; an accepted buyer can read
  the corresponding document. Chat files require ownership or an exact message/path
  association in an authorized thread, rather than access to every file of a chat partner.
- Storage MIME allowlists are conservative defaults; file sizes inherit project limits.
  Owner review of quotas/scanning/retention is required before production traffic.
- Publish messages, threads and notifications once. Existing RLS still applies to
  Realtime authorization. No scheduled jobs or external functions are deployed.

## Required frontend and Edge changes before cutover

| Existing behavior | Required replacement |
| --- | --- |
| Withdrawals inserted directly; admins update status directly | `request_withdrawal`, `approve_withdrawal`, `reject_withdrawal`; display available vs reserved balance |
| Admin subscription table insert/upsert or evidence review | `activate_subscription(_request_id,_end_date,_payment_reference)` or `reject_subscription_request(_request_id,_reason)`; active-term renewal remains blocked |
| Payment approval with only transaction ID | Supply `_payment_reference` to `approve_secure_payment`; missing reference fails closed |
| Public URL stored for private payment/document uploads | Store bucket-relative object path; retrieve through signed/authenticated access |
| Public directory queries include user_id/referred_by/referral_code or expect buyers | Use `get_deal_participants`, `get_chat_participants`, `get_referral_summary` or own/admin profiles as appropriate |
| PropertyDetail/Analytics expect unrestricted profiles or private operational counts | Use the public projection/aggregate RPC, or restrict the page to an authorized role |
| Listing submission relies on status to encode sale/rental | Explicitly submit listing_type as sale or rental before review; retain it through approval and payment |
| Thread status updated directly to activate | `activate_chat`, admin only until an approved alternative activation policy exists |
| Messages edited or moderation flags cleared directly | Only seen updates are allowed; remove unsupported edit/contact/system actions |
| Reservation status changed directly | Inspection response RPCs; ordinary direct updates are denied |
| Fake success on failed audit or expiry call | Existing names remain callable by authenticated users but internally require admin (or service role for expiry); surface errors |
| Bank settings assumed populated/non-null | Display unconfigured state; do not offer real payments while gated |
| Disputes constructed with Auth IDs or refund labels | Use dispute RPC and explicit refund workflow; relational identifiers remain profile-based |
| Admin overwrites balances, earnings or transaction/subscription states | Use approved RPCs; no browser-level direct money mutation |
| Existing admin-delete-user multi-call cleanup | Do not deploy unchanged: use reviewed retention/soft-delete design and transactional cleanup; new FKs intentionally preserve financial history |

The old frontend connection and all Edge Function files remain unchanged. Those
compatibility tasks are requirements for a later cutover, not changes performed here.
Phone OTP service-role writes remain supported; AI gateway replacement, CORS, Auth
redirects, secrets, SMTP and provider configuration remain separate deployment work.
