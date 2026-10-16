# PROP-CONNECT 2.0 — Visual correction

## Reference comparison

This compares the supplied images with the pre-correction source and the revised implementation.
It is not a screenshot-based or pixel-perfect claim: no connected browser was available.

| Element | Reference | Previous implementation | Correction |
| --- | --- | --- | --- |
| Desktop header | Transparent navigation over photography, central pill | Separate opaque header | Homepage-only fixed overlay, translucent central pill; opaque on scroll |
| Architecture | Bright horizontal glass/concrete house in greenery, right-weighted | Dark symmetrical mansion, heavy forest tint | New daylight forest/glass concept with house on right; restrained overlay |
| Headline | Two editorial lines, varied weights, left aligned | Three large lines dominating architecture | Two principal desktop lines, stronger second line; shorter mobile composition |
| Search | Broad white panel with four muted fields and small actions | Three-control panel | Property kind, location, budget and bedrooms; Buy/Rent/Land; full-width mobile action |
| First discovery section | Editorial introduction immediately below hero | Categories and workflow before featured properties | Featured properties brought forward; categories/workflow retained lower down |
| Mobile | Sage canvas, round image panels, two-column cards | Desktop-like dark hero and wide carousel | Rounded architecture panel, charcoal editorial copy, sage canvas, two-column homepage listings |
| Cards | Generous photography, restrained borders, clear facts/pricing | Sparse metadata | Existing reusable carousel cards refined with bedrooms, bathrooms and size where recorded |
| Lower sections | Cohesive discovery | Mixed older sections | Buy/rent visual collections, city links, estates entry, registration and resource sections |

## Implementation

Edited existing homepage, navigation, property search, carousel cards, homepage motion, marketplace
workflow, footer, CSS and listing-filter consumers. No duplicate homepage, second app or parallel
component library was introduced. Manrope/Inter and the existing six-color design system remain.

New file: `src/assets/architecture-forest-v2.jpg`, an architectural concept generated with the
built-in image-generation tool, then JPEG-encoded at quality 90 for delivery (596,739 bytes).
Original generated PNG remains outside the repository. It is not an actual property listing.

Generation prompt: Photorealistic architectural editorial photograph for a Nigerian real estate
website hero, landscape 16:9; bright overcast daylight and atmospheric mist; lush tropical woodland
and palms; contemporary white concrete/glass house with horizontal terraces on the right; shaded
green negative space on the left; natural greens, realistic construction, subtle warm window light;
no text, logos, UI or watermark. Conceptual architectural inspiration, not a listing.

Existing files changed: `src/pages/{Index,Properties,PropertyQueries.test}.tsx`,
`src/components/{Navbar,PropertyCarousel,Footer}.tsx`,
`src/components/home/{PropertySearch,PropertySearch.test,HomeMotion,MarketplaceFlow}.tsx`, and `src/index.css`.
New documentation/evidence lives in this report and its associated validation JSON.
A local UI backup exists at `.git/visual-correction/ui-before.zip`.

## Behavior and data

Search retains URL-based navigation and now combines intent with kind and minimum bedroom filters.
Land omits irrelevant room/kind constraints. Existing Clear filters also clears the new kind constraint.
Query-derived kind has a removable visible chip. Property metadata and verified badges use actual rows.
The featured-professional query explicitly requests KYC-verified agents; existing RLS remains authoritative.
Cities are browse destinations, not claims about live listing counts. Estate discovery links to the
existing estate filter; it does not claim those records are newly built or manufacture development data.
Concept collection images are labelled as inspiration. Empty/error/loading states remain.

## Motion and responsiveness

Scoped GSAP entrance for architecture, editorial content and search; ScrollTrigger section reveals;
async listing-card stagger owned by the existing carousel with context/media cleanup. Reduced-motion
preferences disable those effects; no scroll hijacking or continuous animation introduced.

Desktop has four search columns and a three-card track. Tablet retains adaptable navigation and
search spacing. Mobile uses a separate image-first sage composition, a two-by-two search layout and
vertical two-column property grid, with local galleries elsewhere preserved. Existing drawer and
account navigation retain their authentication/role logic. Theme, keyboard focus and touch controls
are retained. Actual overflow, cropping and focus behavior require browser verification.

## Validation

The full suite passed: 68 tests across 14 files (baseline: 66). After the final Clear filters change,
the affected search/filter tests were rerun: all 10 passed. The final production build passed,
including the optimized 596.74 kB hero JPEG. Existing Browserslist age and large-chunk warnings remain.
ESLint remains at 357 existing errors and 31 warnings, with no new diagnostics compared with Sprint 1.
Local HTTP smoke checks returned 200 for the homepage, listings route shell and new JPEG asset; these are not rendered browser checks.
All 102 protected-file hashes match, all 50 route declarations remain unchanged, and literal navigation
targets in the edited homepage components match existing routes. git diff --check passed.
Final TypeScript checks passed for both the application and build configuration, including the filter reset refinement. Browser-based, viewport and authenticated workflow tests
were not executed. See visual-correction-integrity.json and visual-correction-lint.json for evidence.

## Manual visual sign-off

1. Open the running homepage at http://localhost:8080/ (or run npm run dev).
2. Review 320, 375, 390, 768, 1024 and 1440px widths with browser device emulation. Save desktop and
   mobile screenshots alongside the two supplied references.
3. Compare header alignment, house crop, headline balance, search spacing and card density; check
   document width equals viewport width. Check 200% zoom and long listing titles/prices.
4. Use keyboard-only navigation: skip link, radio group, selects, menu drawer, close/return focus,
   More links and favorites. Test dark theme and OS reduced motion.
5. Check loading, empty and failed listing requests without inserting production fixtures. Confirm
   real Buy/Rent/Land, city, kind, budget and bedroom queries and Clear filters.
6. Review signed-in account routes using an authorized existing account; do not perform transactions.

## Remaining differences and next steps

Exact reference photography is not licensed or available as a separate asset, so a new concept is
used. Nigerian content, naira prices, empty states and supported routes replace reference sample
records, US locations and mortgage features. Mobile intentionally combines the reference's rounded
sage introduction and two-column discovery, without fabricating its featured properties.

Reference-style bottom navigation and advanced-filter bottom sheets are not added in this correction;
the existing accessible drawer and filters remain. Listing/detail/dashboard pages retain their own
layouts for a subsequent reviewed extension. Visual sign-off remains pending connected-browser
screenshots at all six widths; do not describe this implementation as pixel-perfect.

Backend/Auth/storage configuration, credentials, migrations, roles and financial rules remain unchanged.
No deployment, commit, push or remote-resource mutation was performed.
