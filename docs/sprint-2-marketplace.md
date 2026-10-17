# Sprint 2 — Marketplace and discovery

Status: implemented locally; visual and live authenticated acceptance pending.

## Architecture and scope

The application already uses `/properties` with query parameters and `/property/:id` for details. This sprint reuses these routes, the verified/available property query, existing public agent view, authentication gates, reservation insert contract, chat routes and deal-request RPC. No parallel pages or new dependencies were introduced.

Buy (`?type=for_sale`), Rent (`?type=for_rent`), Land (`?type=land`) and Commercial (`?type=commercial`) share one discovery interface with contextual headings and real returned records. Search (`q`), category (`type`), property kind (`kind`), state (`state`), budget (`price`), minimum bedrooms (`beds`), minimum bathrooms (`baths`) and sorting (`sort`) are URL-backed. Active chips remove individual filters. Clear filters retains sorting. Browser history restores query-driven controls.

Desktop has a filter sidebar; smaller screens use an accessible bottom sheet. Both update the same state. Grid/list controls work, and Load More reveals another twelve fetched records. Loading, failed-request retry, empty marketplace and no-match states are distinct. No sample records are inserted or displayed as production listings.

## Files

| File | Purpose |
| --- | --- |
| `src/pages/Properties.tsx` | Shared discovery, URL filters, sorting, layout and loading states |
| `src/components/DBPropertyCard.tsx` | Grid/list cards, land hierarchy, real prices and local saves |
| `src/pages/PropertyDetail.tsx` | Header, specifications, gallery, inquiry panel, mobile actions and inspection dialog |
| `src/components/PropertyGallery.tsx` | Swipe/snap gallery and keyboard-accessible lightbox |
| `src/hooks/useLocalFavorites.ts` | Shared device-local saves with cross-component synchronization |
| `src/components/PropertyCarousel.tsx` | Reuses local saves; removes unsupported annual rental period |
| `src/styles/marketplace.css`, `src/index.css` | Shared responsive marketplace presentation |
| `src/pages/PropertyQueries.test.tsx` | Discovery/category/filter/sort and query-state regression coverage |
| `src/pages/InspectionRequest.test.tsx` | Mocked inspection payload, failure recovery and duplicate-submit coverage |
| `src/components/PropertyGallery.test.tsx` | Lightbox keyboard/button navigation, Escape and image fallback coverage |

## Functional and safety details

- Rental periods are not stored: yearly labels were removed from the changed discovery/detail/carousel surfaces. Users must confirm terms with the agent.
- Review badges depend on stored flags. Unsupported escrow success statistics and guarantees were removed from property details. Safety guidance links to the existing safety center.
- Land cards prioritize available size and description, without inferred ownership or title claims. Bedroom/bathroom controls are hidden for land; selecting land removes incompatible room filters.
- Gallery images have reserved proportions, native swipe scrolling, image-error fallback and lazy loading after the first image. The lightbox supports arrows, Escape, focus trapping and return focus. Reduced motion is respected.
- Save actions use local browser storage only; no account-backed saved-property feature is implied.
- The inspection dialog requests preferred date/time, not guaranteed availability. Its existing profile IDs and reservation payload are retained. A synchronous pending guard prevents repeated submissions, transport failures reset loading, and optional chat setup failures do not falsely report that the saved request failed.
- Existing role/ownership checks, messaging destinations, deal requests and financial-operation locks remain. Authenticated workflow tests use mocked services and make no remote writes.
- All 102 protected-file hashes matched the preceding checkpoint, including backend/configuration/authentication/package files. Historical migrations were not changed. No deployment, commit or push was performed.

## Verification

The full automated suite passed **79 tests in 17 files**, compared with 73 tests immediately before this sprint (the supplied brief cited an older 71-test baseline). Tests caught a new detail-header crash for an incomplete returned record; a neutral type fallback corrected it before the passing run.

Application and tooling TypeScript checks passed. The final production build passed. A targeted repeat alongside the build timed out one discovery test at the unchanged five-second limit; the final repeat without the build workload passed all 13 targeted tests across three files. ESLint reported **356 errors / 31 warnings**, compared with the prior **357 / 31**; comparison of diagnostic identities found no additions. The removed unsafe reservation payload cast accounts for the reduction. Existing lint failures remain outside this UI scope.

Build warnings include the large JavaScript chunk and outdated Browserslist data. No package upgrades or check suppression were introduced.

## Acceptance still required

Browser discovery returned no available browsers. The installed Chrome extension is enabled, but the app-side native connector is missing. Reinstall the Browser plugin using the application plugin UI, then restart the application and Chrome. No manual registry changes or alternative browser automation were used.

For each of Buy, Rent, Land, Commercial, Search Results, Property Details and Inspection Booking, capture and inspect desktop/mobile screenshots and exercise the visible controls at **320, 360, 375, 390, 430, 768, 1024 and 1440px**. Confirm no unintended page overflow, clipped controls, card collisions, sticky-action overlap or inaccessible dialogs. CSS breakpoints and DOM tests do not establish these visual results; every width remains pending rendered verification.

Live authenticated messaging and inspection submission remain pending separate authorized acceptance with an available session. Mocked tests establish client behavior, not deployed RLS authorization or successful remote bookings.

## Known limitations

- Existing mapping supports a single property's coordinates. It remains on details when coordinates exist; no nonfunctional multi-property map toggle was added.
- Filtering/counting/sorting and Load More operate on records returned by the existing query. This does not introduce server-side pagination or bypass the Supabase response row limit. Larger inventories require a separately scoped server-pagination/count implementation.
- The inspection UI does not advertise available slots, automatic confirmation or financial guarantees. No financial operations were tested or enabled.
- No rendered visual acceptance is claimed, and Sprint 2 is not marked fully accepted.
