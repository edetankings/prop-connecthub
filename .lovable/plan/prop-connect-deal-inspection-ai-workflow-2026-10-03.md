# PROP-CONNECT — Deal, Inspection & AI Workflow

Goal: connect Property → Buyer → Agent → Inspection → Deal → Payment → Completion. This builds on what already exists and redesigns nothing.

## What already exists (reused)
- **Deal requests**: buyers already "Request Deal", and agents Accept or Decline with a reason on the Deals page. Accepting creates a transaction and unlocks secure payment.
- **Payments**: the secure payment page, proof upload, admin approval, release, refund and 72h expiry all work today and stay unchanged.
- **Reservations**: buyers can request a viewing with a date. This becomes "Inspection".
- **Chat**: chats are tied to a property, buyer and agent. Agents cannot start chats.
- **Prop Connect AI**: works, requires sign-in, and keeps a separate history for each account.
- **Notifications, disputes, audit logs, property codes**: all reused.

## Phase 1 — Property page actions + Buy/Rent Now
- On the property page, the buttons become **Chat with Agent · Book Inspection · Buy Now** (or **Rent Now** for rentals).
- Chat opens the existing chat for that property, and never creates a duplicate.
- Buy/Rent Now opens a **Deal Summary**: image, title, Property ID, location, price, type, agent and their verification and trust score. The button reads **Request to Buy / Request to Rent**.
- After sending, the buyer sees "Waiting for agent confirmation".
- A buyer can only have one active deal per property. Sending a request never marks the property sold or rented.

## Phase 2 — Inspections without admin bottleneck
- Inspection requests go straight to the agent. The agent can **Confirm**, **Propose new time** or **Decline**.
- The buyer can accept or reject a proposed time.
- Statuses: requested, confirmed, reschedule_proposed, declined, cancelled, completed, no_show.
- Admin keeps a read-only overview of all inspections and steps in only for disputes or reports.

## Phase 3 — Deal Room
- New page per accepted deal, with a deal number like `PC-2026-000184`.
- Sections: Overview, Property, Buyer/Agent, Inspection, Documents, Payment Status (linked to the existing secure payment), Activity, and a progress timeline.
- Deal stages: pending_agent → accepted → inspection → documents → payment_pending → payment_under_review → payment_confirmed → completed (or declined / cancelled / disputed).
- Linked from the buyer dashboard, the agent's Deals page and admin.

## Phase 4 — AI property assistant
- Upgrade the existing Prop Connect AI. It will search real, approved listings using filters such as city, budget, bedrooms and type, and return clickable property cards.
- It never shows other users' data, agent contact details, unapproved listings or legal and financial guarantees.

## Phase 5 — Notifications + Admin
- Notifications for: deal requested, accepted or declined; inspection requested, confirmed, rescheduled or declined; and each deal stage change.
- An admin Deals and Inspections overview with filters, kept separate from the existing secure payments page.

## Technical details
- Add a `deal_number` column and an extended deal `stage` to `deal_requests`, plus a unique partial index stopping a buyer from having two active deals on the same property.
- Add new deal stages as text values. The existing `payment_status` on transactions stays the source of truth for payment; the deal stage shows it, mapped across.
- Add inspection fields to `reservations`: `inspection_time`, `proposed_date`, `proposed_time`, `agent_note`, and a new text `inspection_status` column. The existing enum stays and is mapped for backward compatibility.
- New `deal_events` table for the activity timeline, readable only by the buyer, the agent and admins. All writes happen inside security definer functions.
- New functions: `confirm_inspection`, `propose_inspection_time`, `respond_inspection_proposal`, `decline_inspection`, `advance_deal_stage`. Each checks the caller's role server-side, writes an audit entry and sends a notification.
- AI: the `prop-ai` function gets a property search tool that queries only approved, public listings using the caller's own access.
- Every change adds to what's there. Nothing existing is dropped or renamed.
