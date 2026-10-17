# Sprint 3 — Authentication, registration and onboarding

Status: local implementation; rendered visual acceptance and live authentication acceptance pending.

## Existing architecture

- The existing routes are `/login`, `/register`, `/forgot-password` and `/reset-password`. No new authentication routes or provider were added.
- `AuthProvider` uses Supabase password sign-in, persistent sessions, automatic refresh and URL session detection. Signup sends full name, phone, profile type and the existing optional referral code. The confirmation redirect remains the current origin. Login still navigates to `/dashboard`; that router chooses buyer, agent, builder or administrator destinations.
- `profile_type` has exactly `buyer`, `agent` and `builder`. These categories do not assign administrator privileges. `has_role` and existing guards still determine administrator access. The baseline's `handle_new_user` trigger creates the profile and processes supported metadata; it was not modified.
- Password recovery already validates SDK sessions and identity, rejects explicit URL errors, handles late Auth events, guards duplicate submissions and requires a confirmed `updateUser` result. These checks remain intact. Signup's existing five password rules and reset's existing eight-character minimum remain unchanged; their different requirements were not silently reconciled.
- The previous welcome dialog treated builders as agents and advertised referral payouts. It already stored dismissal in `profiles.welcome_seen`. The verification hook exposes `pending`, `verified`, `rejected` or no returned record; there is no new suspended/approved-account state.

## Implementation

| File | Change |
| --- | --- |
| `src/components/auth/AuthLayout.tsx` | Shared architectural split screen, home/terms/privacy links and compact mobile identity |
| `src/styles/auth.css`, `src/index.css` | Manrope/Inter, brand colors, mobile layout, field spacing, focus states, safe areas, scrolling and reduced motion |
| `src/pages/Login.tsx` | Shared layout, autocomplete, accessible errors and existing consent/lockout behavior; resend offered after an unconfirmed-email response |
| `src/pages/Register.tsx` | Native account-type radios, role-specific explanations, existing fields/validation/referral payload and confirmation-waiting presentation |
| `src/components/auth/ConfirmationWaiting.tsx` | Generic waiting copy and existing SDK signup-resend support, guarded pending state, failure feedback and a local cooldown |
| `src/components/auth/EmailConfirmationResult.tsx`, `src/App.tsx` | Observe an existing confirmation callback; display verified status only after `getUser` confirms the signed-in account's email; invalid/error links never display success |
| `src/pages/ForgotPassword.tsx` | Shared presentation and generic eligibility-based request feedback without claiming delivery or account existence |
| `src/pages/ResetPassword.tsx` | Shared layout for checking/invalid/form/success states; accessible password visibility controls and autocomplete |
| `src/components/WelcomeModal.tsx` | Distinct buyer, agent and builder guidance, accessible dialog title/description, optional dismissal and existing preference update |
| `src/components/VerificationBanner.tsx` | Existing verification state presentation and requirements/feedback navigation; no status mutation |
| `src/pages/AuthExperience.test.tsx` | Mocked login, role/referral signup, validation, resend and confirmation-result tests |
| `src/components/OnboardingExperience.test.tsx` | Mocked role introductions, dismissal preference and four existing verification presentations |

Registration remains a single form with clearly separated account choice and details/security sections. It does not add mandatory fields or change signup permissions. Passwords remain in form state and are not placed in URLs, storage, logs or reports. Remember-me and OAuth controls were not added because there is no separate supported implementation to expose.

## Onboarding and account status

Buyer guidance explains real discovery filters, device-local favorites and preferred inspection requests requiring agent confirmation. Professional guidance explains profile completion, existing identity-review requirements and listing workflows. Builder copy explicitly avoids advertising a construction or project-inventory management system. The supported verification form currently includes identity documents, selfie, NIN/BVN, address evidence, bank details and phone verification; this sprint does not submit or change those requirements.

The welcome dialog remains dismissible. Its only existing database update is `welcome_seen` for the authenticated user's `user_id`; failure to persist that preference cannot block navigation. No role, KYC status or financial state is changed. Unsupported payout promises were removed from onboarding.

Verification feedback now distinguishes pending review, verified identity, rejection requiring feedback review, and a prompt to inspect requirements. It does not invent suspension states or say KYC unlocks payments. Financial operations remain locked.

## Preserved security

The Auth provider, Supabase client/configuration, protected routes, role checks, SQL/schema/RLS, migration history, credentials, recovery redirect, signup redirect and financial locks are unchanged. The new callback presentation does not exchange tokens, process custom OTPs, alter URL destinations or grant permissions. It reads `getUser` only when a signup callback is observed. A verified signed-in email is explicitly distinct from professional identity review or proof that a different account's link was applied.

Resend is a user-triggered supported SDK call, not a new mail provider. Its local cooldown is UX protection, not server-side rate limiting. Delivery and hosted SMTP settings are not assumed. Existing login attempt protection is likewise browser-local; the UI describes it as a local sign-in pause rather than a backend account suspension.

## Validation and remaining acceptance

Application and tooling TypeScript checks passed. The full automated suite passed **94 tests in 19 files**, up from 79 tests. A final auth-presentation repeat passed all **7 tests** after the confirmation wording refinement. The production build passed. ESLint reports **353 existing errors and 31 warnings**, down from 356/31; comparison of diagnostic identities found **zero additions**. The remaining lint failures were not concealed or suppressed. Build warnings remain for the large JavaScript bundle and outdated Browserslist data. All **102 protected files** matched the pre-sprint hashes, and all **50 route declarations** remain. `git diff --check` passed. New tests use mocked SDK responses and synthetic identities only. No live registration, email send, password change, onboarding preference write, verification submission or other remote mutation was performed during this sprint.

The initial focused test run exposed JSDOM's missing `ResizeObserver` when the real Radix checkbox mounted. A test-local browser-API stub was added; the real checkbox and production behavior remain in use. No assertion or timeout was weakened.

Browser discovery returned an empty list. Desktop/mobile screenshots and rendered acceptance are pending for sign-in, registration, email confirmation, recovery, reset and onboarding at **320, 360, 375, 390, 430, 768, 1024 and 1440px**. CSS and DOM tests do not prove zero overflow, mobile-keyboard behavior, contrast in the rendered page or touch usability. The existing Chrome extension is installed; the missing app-side connector requires reinstalling the Browser plugin through the application's plugin UI and restarting the application and Chrome.

Once a browser is connected, inspect the above surfaces and exercise keyboard navigation, account selection, show/hide, form validation, confirmation resend/cooldown, expired links, onboarding dismissal and status navigation. Live checks require approved test accounts and owner-controlled email access. Never bypass confirmation or request passwords/tokens in chat.

## Limitations

- Confirmation presentation is opportunistic: if the SDK has already consumed callback markers before React mounts, it does not infer a newly confirmed account from an ordinary session. The existing hosted confirmation/login flow remains the fallback.
- The waiting screen reports a request, not verified mail delivery. A signup response alone does not establish a confirmed account. No SMTP or delivery acceptance was performed.
- Existing auth guard and logout regression tests remain part of the suite, but mocked tests do not establish live session persistence, email delivery or deployed authorization behavior.
- The existing verification hook does not distinguish a failed KYC fetch from no returned record. This sprint does not invent a stored status or approval in either case.
- No deployment, commit or push. Full Sprint 3 acceptance remains pending visual and live workflow verification.
