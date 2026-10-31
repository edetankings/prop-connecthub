# Test suite audit — 31 October 2026

## Results

- Baseline: 48 test files; 218 passed and 1 failed.
- Initial local verification: 48 test files; all 231 tests passed, including 12 additional regression cases.
- Application and tooling TypeScript checks passed.
- Production build passed with the existing bundle-size and Browserslist warnings.
- Committed package-lock.json passed npm ci dry-run validation in a temporary directory. The unrelated working-copy lockfile edits were not included.
- GitHub workflow YAML parsed successfully. Workflow execution in GitHub remains a separate check after push.
- Full-repository ESLint baseline remains failing: 258 errors and 18 warnings. Primarily existing explicit-any typing violations, with other style and hook issues. Rules were not disabled to hide these failures.

## Changes supported by new regression cases

- AI: session expiry, rate limits and upstream failures retain an actionable error and permit retry; streamed UTF-8 and JSON survive network chunk boundaries and a final unterminated line; New chat cancels the old request and prevents its late answer from returning.
- Fixed two AI defects exposed by those tests: incomplete final-line processing and uncancelled New chat requests.
- Chat: duplicate Realtime events do not duplicate bubbles; a live message arriving during initial history loading is retained; history errors can be retried; subscriptions are removed and late callbacks ignored on unmount. Read and seen-update mocks are separated so mutation calls cannot accidentally consume history fixtures.
- Admin subscriptions: a mismatched server acknowledgement does not claim a successful save, and a pending save cannot be submitted twice.
- Property posting: photo and document controls remain, while video posting controls are absent.
- Admin metrics: wait for completed counts rather than the already-visible navigation labels, removing the baseline loading race without increasing global timeouts.

## Database checks

Executed against the verified project prtrpywkwmnpowrthppg:

- database/updates/verify-chat-security.sql: restricted quick questions, restricted attachment/free-text rejection, outsider read/send denial, forged sender rejection, active-chat ordinary text.
- database/updates/verify-subscription-control.sql: administrator toggles, non-admin denial, listing behavior while OFF, KYC enforcement and anonymous restrictions.

These checks create synthetic records inside transactions and roll them back. They do not read customer conversations or send provider requests.

## Continuous verification

.github/workflows/checks.yml runs npm ci, both TypeScript checks, npm test and npm run build for main pushes and pull requests. It has read-only repository permission and no application/provider credentials. ESLint remains a separate command until its existing backlog is resolved; passing CI does not mean lint is clean.

## Remaining acceptance checks

Automated mocked-service tests do not prove live browser delivery or real device behavior. Confirm two-account chat delivery/read receipts, actual file and microphone permissions, signed-media rendering, real Gemini responses and account switching, and mobile layout in authenticated browsers. Payment and withdrawal behavior cannot be accepted while the platform intentionally disables those operations. Histories beyond the database row limit still need archival pagination improvements, as noted in chat-system-audit.md.

## Follow-up: first GitHub run

Commit 80c29a6 reached GitHub successfully. The first workflow failed during tests
because AgentOverview imported the pure chat preview helpers, which eagerly
initialized Supabase and depended on ignored local configuration. Dependency
installation and both TypeScript steps had passed.

The attachment module now initializes Supabase only when an upload is requested.
A new regression test makes backend imports throw while formatting previews.
The full suite is rerun with VITE_SUPABASE_URL and
VITE_SUPABASE_PUBLISHABLE_KEY explicitly empty, matching the credential-free
workflow. All 232 tests across 49 files passed with those variables empty.
