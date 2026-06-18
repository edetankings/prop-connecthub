# PROP-CONNECT v1.0 — Secure Payment & Escrow

This is a large platform upgrade (23 parts). I will keep your existing homepage, dashboards, property/agent/buyer/admin pages, and cinematic UI intact, and integrate everything as additive features. I recommend shipping in 5 phases so each milestone is testable.

## Existing foundation I will reuse
- `transactions`, `escrow_holds`, `wallets`, `withdrawals`, `disputes`, `notifications`, `audit_logs`, `reservations`, `property_documents`, `company_wallet`, `payment-screenshots` storage bucket — already exist.
- Sidebar layout, Admin dashboard shell, Agent dashboard, Buyer dashboard, FAQ, Earnings page, WithdrawDialog — already exist.

## Phase 1 — Homepage section + Property ID system
- New component `SecurePaymentFlow.tsx` (glassmorphism, deep-green/white/gold, scroll-animated horizontal timeline desktop / vertical mobile) mounted in `Index.tsx` just above `CinematicFAQ`. 6 steps as specified, with the "Never pay agents directly" warning on Step 2.
- Add FAQ entries (Part 23) into `CinematicFAQ.tsx`.
- DB: add `property_code TEXT UNIQUE` column to `properties`, plus a `state_code` mapping + trigger `generate_property_code()` producing `PROP-{STATE}-{AGENT_REF}-{NNNN}` (per-agent sequence). Backfill existing rows.
- Surface Property ID on property cards, detail page, receipts, reservations, chat header, admin tables.

## Phase 2 — Buyer secure payment flow + Payment page + Submission
- Extend `transactions` with: `property_code`, `commission_amount`, `total_payable`, `payment_status` enum (`pending_payment`, `under_review`, `secured`, `released`, `expired`, `refunded`, `rejected`), `proof_url`, `proof_uploaded_at`, `expires_at` (now + 72h), `released_at`.
- DB enum + `commission_settings` table (sales %, rental %, reservation flat) editable by admin.
- New page `SecurePayment.tsx` at `/secure-payment/:propertyId`: shows property info, transaction summary, company account (config table `platform_settings`), warning notice, "I HAVE MADE PAYMENT" button → upload (JPG/PNG/PDF) to `payment-screenshots` bucket → status `under_review`.
- "Proceed to Secure Payment" CTA on `PropertyDetail.tsx` (replacing/augmenting current contact CTA for buyers).
- Double-purchase guard: when a transaction enters `pending_payment`/`under_review`/`secured`, property status flips to `payment_pending`; other buyers see "Reserved — payment in progress".

## Phase 3 — Admin Secure Payments dashboard + approval + release
- New admin route `/admin/secure-payments` with tabs: Pending Review, Secured, Released, Refunded, Expired, Rejected.
- Row actions: Approve (→ `secured`, property → `transaction_in_progress`, notify buyer+agent), Reject (reason → `rejected`, property → `available`), View Receipt (signed URL), View Property/Buyer/Agent, Release Funds.
- Release flow: buyer-side "Release Payment" button on Buyer Dashboard once `secured`; admin can also release. On release: credit agent `wallets.balance` minus commission, credit `company_wallet`, log `earnings` row, property → `sold`/`rented`, notify both.
- Expiry: scheduled edge function `expire-stale-transactions` (runs hourly) flips `pending_payment` > 72h with no proof to `expired` and frees the property.

## Phase 4 — Wallet, Withdrawals, Disputes, Refunds, Sales Docs
- Agent wallet panel in `AgentDashboard`: Total Earnings, Pending, Withdrawable, Released, Total Withdrawn (derived from existing `wallets` + `earnings` + `withdrawals`).
- Withdrawal request dialog already exists — wire admin Approve/Reject + status flow Pending → Approved → Paid, with audit log entry.
- Buyer "Raise Dispute" on a transaction → existing `disputes` table; admin resolution UI with Open / Under Review / Resolved / Refunded states; agent response thread.
- Refund action on admin transaction row → status `refunded`, reverses wallet credit if released, records reason; refund history tab.
- Sales document upload on completed transactions (`property_documents` already exists) — agent uploads agreement/transfer/allocation; buyer can download via signed URLs.

## Phase 5 — Notifications, Audit Logs, Admin Analytics, Transaction History views
- Wire `notifications` inserts at every state change listed in Part 18 (DB triggers where possible).
- Audit log writes (Part 19) via SECURITY DEFINER helper `log_admin_action(action, entity, entity_id, meta)` called from admin RPCs; new `/admin/audit` viewer with filters.
- Admin analytics cards on `Analytics.tsx`: Total Transactions, GMV, Company Revenue, Refunds, Active, Pending, Avg Transaction Time.
- Transaction history sections on Buyer / Agent / Admin dashboards with Property ID, status, receipts, dates.

## Technical notes
- All new tables get `GRANT` + RLS in the same migration: buyers see only their own transactions/disputes; agents see only transactions on their properties; admins via `has_role(auth.uid(),'admin')`.
- Fund movements (approve, release, refund, withdraw) executed in SECURITY DEFINER Postgres functions so wallet math + status + audit + notification happen atomically.
- Storage: receipts in `payment-screenshots` (private, owner-folder policies already in place); sales docs in `property_documents` (private).
- Edge functions: `expire-stale-transactions` (cron), `release-funds`, `process-refund`, `approve-withdrawal` — each validates the caller's role server-side.
- No homepage redesign. Only additive section + new routes wired into existing sidebar/nav.

## Deliverable per phase
Each phase ends with a working slice you can click through. Reply **"start phase 1"** (or name the phases you want first) and I'll build it. If you'd rather I attempt the whole thing in one pass, say "build all" — it will be a very long single change with higher risk of needing follow-ups.
