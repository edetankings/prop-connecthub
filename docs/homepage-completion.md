# PROP-CONNECT 2.0 — Complete homepage redesign

## Scope and visual approach

One existing homepage, redesigned from navigation to footer. Desktop retains the reference's
photographic architectural hero, floating pill navigation, editorial type and broad white search
surface. The rest of the page now uses the same 1280px containers, forest/ivory/sage palette,
Manrope headings and Inter interface text. Alternating image collections, an editorial city mosaic,
a connected journey, asymmetrical trust/experience sections and a reading-list resource layout
replace the mixture of legacy promotional panels.

Mobile retains the deliberately separate sage/image-first hero and two-column property cards.
Property categories become a swipeable local collection; cities use a two-column mosaic; the journey
becomes a vertical connected timeline. Trust, professionals, development imagery, experience and
partnership sections stack. The footer has a two-column link layout and stacked contact/legal rows.

No new packages or imagery were installed. Existing conceptual architectural assets are reused and
labelled as inspiration. City visuals are not presented as photographs of those cities or real listings.

## Completeness audit: all 14 sections

Status meanings: **implemented** means source/layout/action wiring is present and reviewed.
**Visual pending** means desktop/mobile screenshots, cropping, overflow and keyboard behavior have
not been confirmed in a real browser. Data contracts were reviewed against existing code/types;
mocked tests are not live Supabase acceptance. The final validation section records executed results.

| # | Section / status | Desktop implementation | Mobile implementation | Motion | Data source and limitation | Actions and verification |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Navigation — implemented; visual pending | Existing over-image pill bar, scroll transition, account actions | Existing focus-trapped drawer and compact branding | CSS scroll/hover/drawer transitions | Existing useAuth; no Auth changes | Existing routes preserved; literal targets checked; live account navigation pending |
| 2 | Hero — implemented; visual pending | Architectural photography, editorial headline, four-field search | Rounded image-first sage composition, compact two-by-two search fields | Scoped GSAP image/headline/search entrance | Existing concept image; query-based property search | Existing intent, budget, location, kind and bedroom tests; browser interaction pending |
| 3 | Property types — implemented; visual pending | Five image-led category cards | Horizontally swipeable category collection | Section reveals and restrained image hover | Configured categories, not fabricated inventory; developments maps to estate | house/apartment/land/commercial/estate filters; URL tests and route review |
| 4 | Featured properties — implemented; visual pending | Real-data three-card collection | Two-column cards with local favorites | Existing async card stagger; heading reveal | properties, is_verified=true, existing available statuses, latest 12; loading/error/empty states | Existing detail/favorite tests; homepage failure/retry and empty-state tests; live data pending |
| 5 | Nigerian locations — implemented; visual pending | Staggered editorial image mosaic | Two-column image cards | Section reveals and image hover | Configured Nigerian destinations; concept imagery, not city photos; no invented counts | Encoded q parameters; Lagos destination covered by DOM test |
| 6 | How it works — implemented; visual pending | Five connected horizontal steps | Vertical connected timeline | GSAP ScrollTrigger stagger | Informational workflow, financial locks stated | Existing property search and deal/dashboard routes remain; no transaction enabled |
| 7 | Trust — implemented; visual pending | Split editorial/image composition and five linked trust rows | Stacked image and concise rows | Section reveals/image-mask transition | Existing verification/privacy/conduct resources; no safety guarantees | All five resource destinations source-checked; no security policy changed |
| 8 | Professionals — implemented with agent-only limitation; visual pending | Editorial verified profile cards or designed empty state | Single-column profiles | Section heading entrance; cards remain visible when async data arrives | public_profiles: profile_type=agent, kyc_verified=true; no fake headshots/counts | Existing /agent/:id supports agents only. Builders intentionally not advertised as supported public profiles; registration remains available |
| 9 | Developments — implemented as estate discovery; visual pending | Architectural split introduction and actual estate collection/empty state | Stacked photo, copy and collection | Image-mask/section reveals | Estate subset of latest 12 properties; no unit counts or project/newness claims | Existing estate search always available; estate-only fixture regression |
| 10 | Buyer/renter experience — implemented; visual pending | Asymmetrical lifestyle photo and five action rows | Image then vertical action list | Desktop subtle image parallax; section reveals | Existing search, local favorites, messaging, inspections and dashboard behavior | Existing URLs preserved; protected flows still require sign-in; no authenticated acceptance claim |
| 11 | Agent/builder partnership — implemented; visual pending | Sage split invitation and numbered benefits | Stacked invitation/benefits | Section reveals | Existing registration/onboarding; no new signup role logic | /register preserved; no admin or role assignments |
| 12 | Guides/resources — implemented; visual pending | Numbered editorial reading list | Compact stacked reading list | Row reveals and subtle arrow hover | Actual existing guide and safety pages; no CMS/articles/authors/dates fabricated | Existing investing, verification and fraud-prevention routes reviewed |
| 13 | Final CTA — implemented; visual pending | Forest-green editorial headline and two actions | Scaled headline and stacked full-width actions | Scoped ScrollTrigger entrance | Static brand copy; no statistical claims | /properties and /register, semantic links via Button asChild |
| 14 | Footer — implemented; visual pending | Wordmark, four navigation columns, contact/social/legal rows | Two-column link groups and stacked contact/legal | Restrained hover/focus feedback | Existing contact details, Instagram and TikTok URLs retained | Existing route targets reviewed; malformed Facebook URL containing spaces omitted rather than replaced with an invented profile; external accounts not live-verified |

## Functional and architectural decisions

The previous standalone statistics, financial promotion, FAQ and repeated CTA blocks were consolidated
into the requested 14-section structure. The underlying pages, RPCs, transaction locks and components
were not deleted. Obsolete FAQ structured data was removed because the corresponding FAQ is no longer
on this page. Canonical and social URL configuration remains unchanged.

The public profile page currently filters profile_type=agent. Displaying builders as linked public
professionals would therefore create not-found destinations. Homepage professional cards remain
agent-only; builders retain the real registration/onboarding action. A public builder directory and
profile route need separate design/authorization rather than a misleading link.

New Developments reuses estate listings rather than asserting construction status or available units
that the current contract cannot establish. The empty state specifies the latest collection, not a
claim that the entire database has no projects. The full estate search remains available.

## Files and motion

Edited: src/pages/Index.tsx, src/components/Navbar.tsx (audit marker only),
src/components/home/MarketplaceFlow.tsx, src/components/home/HomeMotion.tsx,
src/components/AgentCard.tsx (opt-in editorial variant), src/components/Footer.tsx and src/index.css.
Added: src/pages/Homepage.test.tsx for content/data-boundary regressions, this report and its evidence JSON.
Existing non-homepage AgentCard behavior remains the default. No second homepage, route or UI library.
A pre-change local source backup is at .git/homepage-completion/ui-before.zip.

GSAP uses scoped contexts/media cleanup. The five-step timeline has staggered ScrollTrigger entrances;
selected imagery has one-shot mask reveals. Lifestyle imagery has small scrubbed desktop parallax.
Existing hero and asynchronous property-card effects remain. Reduced-motion preferences skip the
GSAP effects and CSS suppresses transitions. No scroll hijacking or continuous animation.

## Validation

TypeScript checks passed for application and build configuration, including the new homepage tests.
The production build passed (3,657 modules). Existing stale Browserslist and large-chunk warnings remain.
ESLint remains at 357 existing errors and 31 warnings, with zero new diagnostics; no rule changes.
All 102 protected files match their recorded hashes and all 50 route declarations remain unchanged.
Edited-component literal links resolve to existing route declarations. git diff --check passed.

The requested test baseline is 66; the immediately preceding actual suite had 68 tests. An initial
concurrent run produced 67 passes and one five-second search-test timeout. A fresh single-worker run,
after heavy validation completed, includes the three new homepage tests. No timeout or assertion was
weakened. Final result: **71 tests passed across 15 files**, with zero failures (89.22 seconds).
The new three-test homepage coverage passed; the formerly timed-out search test passed unchanged.

The new homepage DOM tests exercised all 14 sections, required empty states, verified-professional
query predicates, estate-only card selection, request failure/retry and selected destination URLs.
They mock the backend and carousel/motion boundary; they do not validate live data, CSS or animation.
The test output includes inherited React fetchPriority and React Router future-flag warnings;
these were not suppressed.

## Browser and manual sign-off

Browser discovery returned no connected browser. No full-page screenshots, actual viewport overflow,
font rendering, visual/pixel accuracy or authenticated workflows are claimed as verified. Source
review and JSDOM cannot establish those results. Visual sign-off remains pending for every section.

Open http://localhost:8080/ (or npm run dev). Capture full-page screenshots at 320, 375, 390, 768,
1024 and 1440px; compare them side by side with the supplied references. Inspect every row of the
14-section audit. Check narrow-screen category scrolling stays inside its collection, timeline
connectors, long names/prices, empty/error content, footer columns and absence of document overflow.
Repeat with 200% zoom, dark theme and OS reduced motion. Use keyboard-only navigation through the
search radios/selects, drawer, favorites, resources and footer. Check the real listings and authorized
account routes without exercising financial operations or writing test fixtures to the database.

Supabase configuration, credentials, Auth logic, schemas, RLS, storage, Edge Functions and financial
rules remain untouched. No deployment, commit or push. Sprint 2 has not begun.
