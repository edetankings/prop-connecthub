# Admin portal implementation

Implemented 28 October 2026 from the approved admin UI sample.

## Delivered

- A dedicated forest-green admin shell, grouped navigation, breadcrumbs, section
  finder, account controls, dark-theme support, and accessible mobile drawer.
- A live overview with four priority metrics, combined property/KYC review queue,
  search, five-row pagination, individual-record links, recent audit activity,
  support requests, and independently loaded panel states.
- The existing subscription control on the overview and platform settings page.
  Waitlist registration, email sending, and payments retain their actual availability.
- URL-based section state, direct property/KYC review links, and shared navigation
  for analytics. Finance and referral subnavigation keeps existing tools reachable.
- Section-specific data requests in the older console; unrelated datasets no longer
  have to load before an administrator can review the selected section.

The review preview loads up to the latest 100 pending submissions from each source.
When more exist, the interface explicitly identifies this scope and links to the
existing review sections. No fabricated dashboard records or growth figures are used.
No backend schema, policies, or live platform settings were changed for this redesign.

## Verification

- Full Vitest suite: 45 files and 200 tests passed.
- Application and Node/config TypeScript checks passed.
- ESLint passed for the new admin components and tests.
- Production build passed; the existing large-chunk advisory remains.
- Headless Chrome at 1536×1100 and 390×844: no JavaScript exceptions or horizontal
  document overflow; mobile drawer and both subscription states worked against an
  isolated fixture service. This is browser interaction testing, not a new live-user
  authorization or payment-flow claim.

## Screenshots

These screenshots show the actual implementation with isolated test data, not live
customer records. The fixture server and auth stubs live only in the temporary test
directory and are not part of the app or its build.

- [Desktop implementation](admin-desktop-implementation.png)
- [Mobile implementation](admin-mobile-implementation.png)

The local development server uses port 8081 because port 8080 was already occupied
by another project. Sign in with an administrator account and visit `/admin`.
