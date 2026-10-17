# PROP-CONNECT — Responsive refinement and design audit

Status: implementation rebuilt; **visual and real-device acceptance pending**.
The previous UI was rejected by the owner. This report does not rate the revised UI as accepted or
claim that passing automated tests proves responsive quality.

## Weaknesses found

- Phone hero used an absolutely positioned 340px photograph plus matching spacer padding. This was
  fragile under viewport/font changes and created an excessively long, disconnected introduction.
- Tiny two-column phone cards crowded status badges, clipped long prices/titles, reduced metadata
  to 10–11px and hid their view action/category. A global body minimum width could mask sizing issues.
- Successive home-specific CSS blocks overrode one another, making layout behavior difficult to trace.
- Hero, categories, city cards, trust, development and lifestyle panels repeatedly reused the same
  architectural concepts. These were not photographs of the named cities or actual project inventory.
- Every narrow search field had small text; 14px input text could trigger focus zoom on iOS.
- Desktop navigation used utility-class breakpoints without one explicit width policy. Some actions
  retained nested link/button markup; that inherited markup remains a follow-up accessibility item.
- Favorites were initialized per card: saving another card could overwrite a previously saved ID.
  Malformed stored data could also throw. Carousel arrow state did not track resizes.

## Underlying changes

Home rules now live in one imported `src/styles/homepage.css`. Shared theme/accessibility rules remain
in `src/index.css`. The existing homepage/sections are retained, not duplicated. Fluid gutter, section
spacing, heading/body scale, 16px surface radius and constrained grids govern the compositions.
This is source organization and implementation work; the actual rendered result needs screenshots.

The phone hero now uses normal document flow: editorial content, ratio-reserved photograph, search
and caption. No spacer is synchronized to an absolute mobile photo. Phone search fields stack, use
16px text and retain all filters and help copy. Larger screens use two or four columns.

Phone featured cards use one readable column; tablet uses two and larger screens use three in the
collection. Full titles, prices, location, status, features and view action remain in the markup and
are not hidden on phones. Price/title wrapping and minimum-zero grid items prevent known intrinsic
sizing problems in source. Actual overflow/cropping at the target widths has not been visually checked.

## Changes across all 14 sections

| Section | Refinement | Acceptance evidence / outstanding work |
| --- | --- | --- |
| Navigation | Explicit navigation classes and one desktop breakpoint; compact actions, flexible wordmark and 44px mobile controls | Existing routes/Auth preserved; connected-browser keyboard/width checks pending |
| Hero | Normal-flow phone composition, ratio-reserved photo, shorter text treatment and deliberate desktop background | Source reviewed; screenshot composition/cropping pending |
| Categories | One architectural lead tile with four restrained type/icon tiles; no five-way repeated photographs | Existing category queries preserved; phone bento wrapping needs visual check |
| Featured properties | Full-width phone cards; consistent ratio and readable facts/prices; neutral failed-image fallback | New long-price/image/favorites regressions; real-device fit pending |
| Explore Nigeria | Editorial state/city/action rows replace misleading repeated architectural city imagery | Real destination query URLs retained; no inventory counts fabricated |
| How it works | Existing connected horizontal/vertical journey uses the shared spacing/type policy | All five steps retained; touch/connector visual inspection pending |
| Trust | Clear editorial principle replaces another repeated concept photo; restrained typography | Existing safety/privacy routes; no guarantee language or backend changes |
| Professionals | Shared spacing/radii, readable text, responsive one/two/three-column presentation | Real verified-agent data retained; no public builder route invented |
| Developments | Real returned estate image when available; intentional typographic panel otherwise | Estate-only data and image/error fallback regression; no fake projects/units/newness |
| Buyer/renter experience | Existing single lifestyle image replaces repeated hero use; bounded desktop-only parallax; readable action rows | Existing search, favorites, message, inspection and dashboard destinations retained |
| Agent/builder partnership | Shared spacing, balanced conversion layout, wrapping action | Existing registration preserved; phone CTA/zoom acceptance pending |
| Resources | Larger reading text and restrained numbered rows, no repeated card/stock-photo grid | Existing guide/safety content; no fake articles/authors/dates |
| Final CTA | Same editorial closing composition with consistent type/gutters and wrapping full-width phone actions | Real properties/register links; visual acceptance pending |
| Footer | Constrained columns, wrapping labels/contact text and comfortable targets | Configured links retained; narrow/zoom visual acceptance pending |

## Image audit

| Asset/source | Dimensions / size | Intended role |
| --- | --- | --- |
| architecture-forest-v2.jpg | 1672 × 941; 596,739 bytes | Hero concept, labelled as architectural inspiration |
| cinematic-2.jpg | 1280 × 1600; 120,087 bytes | Single lead category concept |
| cinematic-3.jpg | 1600 × 1200; 322,389 bytes | Buyer/renter lifestyle concept |
| Returned property/estate images | Backend-provided; dimensions vary | Actual listing imagery; neutral placeholder on missing/failed images |
| Professional avatars | Backend-provided or existing neutral icon | No fabricated professional photographs |

No new image package or asset was installed. Existing concepts are not presented as city photographs,
customer properties or development inventory. Ratio boxes reserve image space; original asset quality
and final crops must still be reviewed in the browser. Dynamic image permissions were not changed.

## Favorites, motion and accessibility

Favorites now merge against the latest browser storage, validate stored arrays and synchronize card
state through storage/local events. Saving or unsaving one card preserves other IDs. Tests cover two
cards, malformed data, large prices and failed real images. No database favorite records are written.
ResizeObserver/window resize updates gallery controls; listeners and observers are cleaned up.

Motion retains scoped GSAP cleanup and reduced-motion support. Desktop parallax now uses its own
media query and reverts when switching to smaller widths. Reveal opacity starts readable rather
than fully transparent for sections/cards. No body-wide horizontal clipping was added to disguise
layout issues. Existing visible keyboard focus and all 14 sections remain.

## Files

Modified: src/index.css, src/pages/Index.tsx, src/components/Navbar.tsx,
src/components/home/PropertySearch.tsx, src/components/home/MarketplaceFlow.tsx,
src/components/home/HomeMotion.tsx, src/components/PropertyCarousel.tsx,
src/components/PropertyCarousel.test.tsx and src/pages/Homepage.test.tsx.
Added: src/styles/homepage.css and this report/evidence JSON.
Local source recovery copy: .git/responsive-refinement/before.zip.
No package, route, credential, migration, Auth, RLS, storage or Edge Function changes.

## Executed validation

TypeScript: application and build-configuration checks passed after correcting an intermediate
estate-image variable scope error. Production build passed (3,657 modules); existing stale
Browserslist and large-chunk warnings remain. ESLint: 357 existing errors, 31 warnings, zero new
diagnostics against the 71-test baseline. Final suite: **73 tests passed across 15 files**, zero failures, compared with the 71-test baseline.
The added regressions cover cross-card favorites preservation, malformed local data, large-price
content and missing/failed listing imagery. Existing React Router future-flag warnings remain.
All 102 protected-file hashes match and the 50 route declarations are unchanged.
Edited-component literal targets match existing routes; git diff --check passed.

## Chrome connection blocker and required visual proof

Chrome is installed and running. The required Chrome extension is now confirmed installed and enabled
(version 1.26.1005.11759). Browser-client still cannot attach because the app-side native messaging
connector manifest and Windows registration remain missing. Installing an unrelated extension or simply launching Chrome cannot
repair this transport. Reinstall the Browser plugin through the app plugin UI, then confirm the
configured ChatGPT extension is enabled in the Chrome profile being used. No native-host/registry
repair was attempted, and no alternative automation bypass was used.

No screenshots or real-phone results are claimed. Required checks remain pending at **320, 360, 375,
390, 430, 768, 1024 and 1440px**. Capture full-page 1440, 390, 320 and 768px screenshots and compare each
of the 14 sections with the supplied references. Check document width, phone search, long prices and
titles, actual listing images, menu focus/close/return focus, touch targets, section transitions,
dark theme, reduced motion and 200% zoom. Complete a real-phone review before accepting the design.

No deployment, commit, push, financial activation or remote Supabase changes were performed.
