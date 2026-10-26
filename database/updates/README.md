# Subscription control update

Apply `20261026_subscription_control.sql` in the SQL Editor of the independent
Supabase project `prtrpywkwmnpowrthppg`, after its v1 baseline is installed.
The file runs as a transaction. Do not replay historical migration directories.
For an installation made before the safe-update fix, apply
`20261026_subscription_control_safeupdate.sql` as well. It replaces only the
setter function and preserves the current setting and function permissions.

The update defaults subscriptions to ON, preserving the previous listing rule.
An authenticated administrator can persist ON/OFF through
`set_subscriptions_enabled`; every change is recorded in the existing audit log.
Authenticated clients can read only the boolean through `get_subscriptions_enabled`.
The existing admin-only platform settings table policies remain in effect.

OFF lets KYC-verified agents and builders submit listings without an active
subscription. KYC, ownership, and moderation controls still apply. New subscription
payment-proof requests are rejected while OFF. Existing subscription terms and
pending requests are retained, and pending requests can still be reviewed.
ON restores the active-subscription requirement. Neither setting approves financial
configuration or transfers money.

After applying, verify with actual authenticated accounts:

1. An admin can toggle OFF, reload the admin page, and still see OFF.
2. A verified agent or builder without a subscription can submit for review while OFF.
3. An unverified professional cannot submit for review while OFF.
4. A non-admin cannot call the setter or update platform settings directly.
5. New subscription requests are rejected while OFF, including direct API inserts.
6. Turning ON blocks submission without an active subscription; active subscribers
   retain access, and existing terms have not changed.

Frontend tests mock the service boundary. They do not establish that this SQL has
been installed or that live actor authorization has passed.

## Installation verification — 26 October 2026

Installed in `prtrpywkwmnpowrthppg` with the initial setting ON.
`verify-subscription-control.sql` passed against that database using simulated
authenticated database roles. It verified administrator ON/OFF writes, non-admin
setter and direct-update denial, verified agent and builder access while OFF,
KYC enforcement, rejection of new subscription requests while OFF, restoration
of the subscription requirement while ON, and anonymous RPC permission denial.
All fixture accounts, audit entries, notifications, and test setting changes were
rolled back. The final setting remained ON, RLS stayed enabled, and no fixture
accounts remained. Browser-session end-to-end verification is separate.

The initial database-role test did not exercise API safe-update protection.
An admin-session error identified its requirement for an explicit WHERE clause.
The setter now scopes its update with `WHERE singleton=true`; this correction
has been installed in the same project. The CLI Management API does not permit
loading the safeupdate library. After this fix, the owner confirmed that both
OFF and ON save successfully in the actual administrator browser session.
