# PROP-CONNECT 2.0 — Sprint 1

Find Your Place. Move With Confidence.

## Architecture and scope

The application uses React/TypeScript, Vite, Tailwind semantic CSS variables, React Router,
Radix-based UI primitives, an existing GSAP/ScrollTrigger installation, and Framer Motion.
`App.tsx` continues to own public/protected/admin routes, AuthProvider, theme and query providers.
Supabase clients, generated types, Auth logic, Edge Functions, storage, migrations and financial
locks are unchanged. Existing unrelated worktree edits were retained.

This sprint establishes shared foundations and starts the homepage; it does not redesign all pages.
No Figma document was created. The supplied desktop and mobile references informed the implementation.
Existing architectural imagery is reused and labelled as inspiration rather than an available listing.
The pre-sprint UI is recoverable from `.git/sprint1-checkpoint/ui-before.zip`.

## Design system

| Token | Value | Use |
| --- | --- | --- |
| Forest | #0B4938 | Primary buttons, active navigation |
| Emerald | #138562 | Secondary actions and focus outlines |
| Sage | #DDEFE6 | Supporting accents |
| Ivory | #F7F8F5 | Page and search surfaces |
| Charcoal | #17231F | Body text |
| White | #FFFFFF | Cards and inverse text |

Manrope is used for headings; Inter for interface text, loaded through Google Fonts with
`display=swap` and sans-serif fallbacks. First-render layout does not depend on font availability.
Self-hosting approved font files can follow if deployment policy requires it. Legacy semantic
tokens remain compatible with existing pages; all older page layouts have not been redesigned.

Buttons, inputs, cards, badges (through existing semantic variants), tabs and dialogs retain
their existing component APIs. Updated primitives provide rounded corners, restrained shadows,
visible focus, disabled states and improved touch sizing. Radix continues to manage modal/drawer
focus trapping, keyboard dismissal and focus restoration. Dialogs fit small viewports and scroll.
`PageContainer` and `ListingSkeleton` supply reusable layout/loading foundations.

## Homepage and responsive behavior

- Editorial, left-aligned architecture hero with a contrasting forest overlay; honest trust guidance.
- Buy/Rent/Land radio selection, labelled location/budget controls, real URL-based discovery.
- Property and agent queries remain on existing public tables/views; no synthetic production rows or counts.
- Loading, failure/retry and empty states for the homepage listing and agent sections.
- Existing marketplace categories, workflow, agent directory, stats, FAQ and secondary sections retained.
- Featured cards show real listing fields and preserve local favorites; favorite buttons are no longer nested in links.
- Budget and location query parameters now initialize/synchronize the existing listings filters.
- Mobile 320–767px: stacked search controls, compact brand, scrolling focus-trapped drawer and swipeable cards.
- Tablet 768–1023px: horizontal search and three-card track; mobile navigation retained.
- Desktop 1024px+: pill navigation, account actions and a capped 1280px content width.
- No fixed-height mobile hero: content can grow with text size and stacked controls.

Buy/Rent/Land/Commercial keep existing query-based routes. Explore points to `/#discover`.
Agents, How it works and AI Assistant remain reachable through More/mobile navigation.
Existing dashboard/messages/settings/admin/sign-out options retain the same Auth/role logic.

## Motion

`HomeMotion` uses scoped GSAP contexts and matchMedia. Hero elements reveal once; selected editorial
sections use ScrollTrigger. Cleanup reverts both contexts and media listeners. The global
`MotionReveal` skips the homepage to avoid competing effects. Existing Framer Motion imagery is
wrapped with `MotionConfig reducedMotion="user"`. CSS reduces transitions and animations globally
when reduced motion is requested; carousel scrolling uses instant behavior in that mode.
No persistent parallax or animation of every listing is introduced.

## Files

Created: `src/components/home/HomeMotion.tsx`, `PropertySearch.tsx`, `PropertySearch.test.tsx`,
`src/components/ui/page-container.tsx`, and this report.

Modified: `src/index.css`, `tailwind.config.ts`, `src/pages/Index.tsx`, `src/pages/Properties.tsx`,
`src/pages/PropertyQueries.test.tsx`, `src/components/Navbar.tsx`, `src/components/MotionReveal.tsx`,
`src/components/PropertyCarousel.tsx`, and `src/components/ui/{button,input,card,tabs,dialog,sheet}.tsx`.

Packages installed: none. Package manifest and lockfile are unchanged by Sprint 1.

## Validation

Application and build-configuration TypeScript checks passed. ESLint reports 357 existing errors and
31 warnings, compared with 361 errors/31 warnings before Sprint 1; no new diagnostics.
All 102 protected-file hashes match and the 50 existing route declarations remain unchanged.
`git diff --check` passed. All 66 tests passed across 14 files, including three new search/filter regressions.
The production build passed (3,659 modules); existing stale Browserslist and large-chunk warnings remain.
The previous CSS font-import-order warning is resolved by placing the import first.
Final targeted lint on the new homepage, navigation, motion, carousel and modal/drawer files passed.
Browser discovery returned no connected
browser. Responsive rules have been reviewed in source, but viewport screenshots, actual overflow,
font rendering, keyboard drawer interaction and authenticated workflows are not claimed as tested.

## Sprint 2

1. Connect a browser and review 320/375/767/768/1023/1024/1440px widths, 200% zoom, focus order,
   drawer dismissal/return focus, dark theme and reduced motion before visual sign-off.
2. Extend the design to discovery, details, agent profiles and dashboards while preserving their workflows.
3. Review inherited secondary-section marketing copy against enabled capabilities; financial operations stay locked.
4. Consider approved self-hosted fonts, responsive image variants and route-level chunk splitting.
5. Continue existing authenticated A1 acceptance when a browser session is available; do not infer backend acceptance
   from mocked component tests or owner-reported general manual success.

No deployment, commit, push or remote database operation is part of this sprint.
