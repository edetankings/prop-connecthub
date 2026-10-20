# Waitlist and subscription dashboard support

## Available now

- Agent overview: read-only subscription summary, scoped to the signed-in Auth UUID. Existing `/payments`, earnings, listing and inspection routes remain available.
- Admin-only `/admin/feature-management`: waitlist and subscription preparation screen, guarded by AdminRoute and an internal admin check.
- Existing admin subscription records remain available at `/admin?view=subscriptions`.
- Both future switches display the requested ON default and are explicitly disabled. They do not represent verified production settings or save anything.

## Backend gaps

The repository database types and historical/independent-baseline schemas contain no waitlist table, waitlist management endpoint, `waitlist_enabled` flag or global `subscriptions_enabled` flag. No remote database inspection was performed for this task. An absent backend is shown as unavailable, never as a successful empty waitlist. No sample emails, status counts or verification claims are supplied.

A functional waitlist requires an agreed record contract (email, registration timestamp, status and permitted status transitions), an enrollment endpoint with abuse prevention, and RLS/grants that restrict reading and managing all registrations to administrators. Public enrollment must not grant public record reads. Verification status must be backed by a genuine verification workflow.

Functional ON/OFF controls require persisted settings with ON defaults, a server-side admin-authorized update API, audit records and enforcement in the enrollment/subscription workflow. Define what turning a feature off does to existing registrations and active subscriptions before implementing it. UI-only switches or localStorage are insufficient.

The existing subscription owner-read policy is `user_id = auth.uid()`. The new agent summary selects only its own status and dates; it does not read the platform settings or other users' subscriptions.

## Preserved behavior

No schema, policy, environment, historical migration or remote resource was changed. No subscription was disabled, activated or cancelled. No payment integration was added. Payment availability remains governed by the existing safeguards. Global live feature states cannot be verified from missing flags and must not be reported as enabled or disabled.
