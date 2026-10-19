# Property details redesign — 19 October 2026

Status: implemented locally. No database migration, remote SQL, credential change, deployment, commit or push was performed. Browser acceptance is pending because browser discovery returned no available browser.

## Existing architecture and scope

`/property/:id` is defined by the existing router. `src/pages/PropertyDetail.tsx` remains the live data and workflow controller: it reads one property through the current Supabase client, reads the associated `public_profiles` record, uses the existing local-favourites hook, and owns inspection and deal-request state. `reservations`, `chat_threads`, `deal_requests` and `request_deal` keep their existing contracts. Authentication, authorization, financial locks and backend files are unchanged.

The local agent and house-listing previews have now been removed at the owner’s request. Real listings continue to use `PropertyDetailsLayout`; no synthetic card, price, agent identity or preview page is supplied by the public directories. No second operational booking or messaging backend exists.

The generated `properties` contract supports title, price, listing type/status, address/city/state/zip code, image URL and image arrays, videos, amenities, bedrooms, bathrooms, square feet, latitude/longitude, property code and agent UUID. Public agent information comes from `public_profiles`. No new database fields were assumed.

## Desktop implementation

- Breadcrumbs, back link, native-share/clipboard fallback and device-local save controls.
- Large image carousel with side thumbnails, image count, previous/next controls, fullscreen dialog, arrow-key navigation and native horizontal swipe scrolling. Duplicate photo URLs are removed and failed/missing photos use the neutral placeholder.
- Property title, naira price, location, supplied status/type/review badge and available specification tiles. Zero values are distinguished from missing values.
- Anchor navigation to Overview, Photos & Video, Location, supported Amenities, Agent and Similar properties.
- Expandable description, structured listing information, dark forest-green amenities panel and native video controls where videos exist.
- Inquiry sidebar retains the existing action JSX. It is sticky only where viewport space permits, with bounded scroll height; shorter viewports use normal document flow.
- Sidebar agent/profile navigation, compact location map and independent-check reminder.
- Similar listings use a bounded read-only query for reviewed, available listings of the same property type, exclude the current listing, prioritize the same city then price proximity, and show at most three. Errors and empty results link back to the existing property search.

## Mobile and tablet implementation

- Edge-to-edge swipe gallery, rounded identity panel, compact specification tiles and horizontally scrollable section links.
- Stacked overview, amenities, media, full-width location, agent and similar content.
- Existing chat and inspection controls are retained in a bottom action bar through tablet widths. The bar reserves document space, includes safe-area padding and stays behind Radix dialogs.
- Booking uses the existing labelled form and native date/time fields in the existing responsive dialog. Requests remain requests; no automatic confirmation is introduced.
- Reduced-motion preferences disable gallery/map animation where configurable. Existing focus-trapped Radix dialogs and visible focus outlines are reused.

## Maps: provider and configuration

The repository already uses Leaflet 1.9.4 and OpenStreetMap tiles. The redesign reuses them with **no dependency or API key added**. Tile attribution links remain visible. No geocoder or new map provider was introduced.

`PropertyMapPreview` provides interactive zoom/keyboard controls, a forest-green marker, a popup containing escaped text, an approximate-area circle where applicable, expanded dialog, loading/error status and retry. Map panning is opt-in to protect normal page scrolling; wheel zoom is off. Resize observers and maps/timers are cleaned up on unmount. Public exact pins have a Google Maps link; approximate/withheld locations do not.

Implementation references: [Leaflet API](https://leafletjs.com/reference.html), [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Public OSM tiles require network access and appropriate operational capacity; no SLA is implied by this UI integration. Production traffic should be evaluated against the provider’s policy.

## Coordinates and privacy

Latitude and longitude already exist in the generated types, baseline schema and property editor. No migration is needed merely to store a pin. Values are checked for finite numbers and legal ranges; `(0, 0)` is valid. No coordinates are fabricated, and no city/neighbourhood is geocoded to impersonate an entrance.

There is **no location-visibility/precision field in the inspected schema**. Consequently live pages default conservatively to `approximate`: latitude and longitude are rounded to two decimal places **before** they reach Leaflet, tile requests, markers, circles or expanded maps. The map is labelled Approximate location, with an explicit explanation that it is not an entrance. Directions are omitted. Street addresses are omitted from the shared presentation and inspection context; public city/state remain visible.

The map component also supports explicit `hidden` and `exact` policies. Hidden prevents map creation, and exact permits the supplied pin and external directions. The live controller does not silently opt into exact mode. Tests cover all three modes. The preview has no coordinates, so it deliberately shows the unavailable state.

**This is display-level redaction, not a server privacy guarantee.** The existing Supabase property endpoint still returns stored address/coordinates to authorized readers under existing policies. Before promising private/approximate listings, the owner must separately approve a schema/API design that stores publication consent/precision and redacts exact location in public responses. No such change was executed here. If that requirement is needed, a separately approved migration and public projection/RLS review are necessary.

## Booking, messaging and financial restrictions

The live controller retains the existing inspection form validation, pending-submission guard, user/profile/property/agent identifiers, reservation insert, requested status and chat initialization. Existing tests verify the actual payload with mocked services and the retry/duplicate-submission behaviour. No live booking was performed for verification.

Chat links retain `/chat/new?agent=...&property=...` for signed-in users; anonymous users go to login. Owner and existing-request states remain. No private phone or email is exposed.

The existing buy/rent enquiry and Deal Room workflow remains as implemented, including its confirmation dialog, request RPC, availability/accepted/pending states and financial-lock messaging. No payment processing, unsupported Make Offer, new purchase endpoint or automatic transaction completion was added.

## Missing backend requirements

- No floor-plan, parking-space or negotiability columns are present in the inspected property contract: those controls/details are omitted.
- No public, authorized property-document inventory is defined by this page’s contract. The page does not expose storage paths or fabricate document links.
- No agency/company field is available on the inspected public profile projection: actual agent identity/verification is shown without an invented agency.
- Location publication consent/precision and server-side redaction require a separate owner decision, as explained above.
- No coordinates means no map/directions; obtain legitimate listing coordinates through the existing property editor.

## Files

Modified: `src/pages/PropertyDetail.tsx`, `src/components/PropertyDetailPreview.tsx`, `src/components/PropertyGallery.tsx`, `src/components/PropertyMapPreview.tsx`, `src/index.css`.

Added: `src/components/PropertyDetailsLayout.tsx`, `src/lib/propertyLocation.ts`, `src/styles/property-details.css`, `src/components/PropertyMapPreview.test.tsx`, `src/components/PropertyDetailsLayout.test.tsx`, this report.

## Validation

| Check | Actual result |
| --- | --- |
| Application TypeScript | Passed: `tsc --noEmit -p tsconfig.app.json` |
| Tooling TypeScript | Passed: `tsc --noEmit -p tsconfig.node.json` |
| Full automated suite | **164 passed, 34 files passed**; no test failures or timeouts in the full run |
| Focused workflows | Property queries, request payload/retry, preview navigation, gallery keyboard/fallback, missing fields, coordinate disclosure and mocked-map lifecycle passed |
| Production build | Passed: `npm run build`; existing large-chunk and outdated Browserslist-data warnings remain |
| ESLint | Still fails on **264 existing errors and 19 warnings**; before/after diagnostic inventory is identical, with zero new diagnostics |
| CSS / whitespace | PostCSS parsing and `git diff --check` passed |
| Protected-file integrity | **102 of 102 unchanged**, checked against original checkpoint SHA-256 hashes |
| Change scope | Five existing frontend files modified, six files added; no existing file deleted; task started with a clean worktree |
| Browser screenshots / viewport acceptance | Pending at all ten requested widths; no connected browser |

Machine-readable test/lint results and the pre-change hash inventory are stored locally under `.git/property-details-checkpoint/`. The production prebuild regenerated SEO files without changing their content. No assertions about live tile availability, authenticated remote booking, live chat delivery or production performance are inferred from these local tests.

Map tests use mocked Leaflet layers to verify coordinate disclosure, popup escaping, loading/failure/retry, expansion and cleanup. They do not prove external tile delivery or real-device map gestures. Booking tests use mocked services; no live account operation was executed.

Requested visual widths: **320, 360, 375, 390, 430, 768, 1024, 1280, 1440 and 1920px**. None is marked visually passed. Browser discovery returned an empty list. Rendered screenshots, actual swipe/map interactions, viewport overflow, sticky sidebar sizing and keyboard-on-mobile behaviour remain acceptance work when a browser is connected.


## Follow-up: agent-posted data compatibility

The agent form’s actual save payload was checked against the public card and shared detail presentation. A new regression test captures the payload produced by `AddProperty` (using mocked storage/SDK), verifies the profile UUID, rental intent, review status, rooms, floor area and coordinates, then renders the resulting record after a **simulated** moderation approval. It confirms the actual saved image/video URLs, naira price, amenities, title and property route appear without substituting the preview house. No real posting or approval was performed.

Agent submissions retain `under_verification` status; public discovery and profile listings require review/approval and an available status. Posting is not immediate public publication.

`publicAgent` now normalizes nullable public-profile fields for both live property details and agent profiles. A missing name uses “Property professional”; missing verification remains false. Public profile UUIDs and supplied identity/verification values are preserved. This prevents nullable public data from breaking the profile layout without inventing credentials.

Follow-up validation: the editor contract, property query, inspection, agent presentation and nullable-profile checks all passed (26 checks across their successful runs). One search test exceeded its original five-second limit in a grouped run, then all nine search tests passed in isolation without changing that limit. Application TypeScript and focused lint passed. The earlier full-suite result above remains the original 164-test run; it is not presented as a rerun of the added follow-up tests.

Follow-up production build passed. Existing chunk-size and Browserslist-data warnings remain.

Remaining acceptance is a separately authorized real agent submission and moderation approval against the destination backend, followed by authenticated browser verification. Local mocked tests establish compatibility of the frontend contracts; they do not prove production storage availability, email/session state, RLS acceptance or live booking delivery. Backend configuration, moderation, financial locks and all protected files remain unchanged.


## Removal of local marketplace previews

Removed the fictional agent, its house collection, the separate demo listing, synthetic location options and the reserved preview-page branches. The listing and agent directories now use only returned backend records, with honest loading, error and empty states. The final real-data card/profile/detail designs and two-column mobile agent grid remain.

Removed implementation files: `src/components/AgentDesignPreview.tsx`, `src/components/PropertyListingPreview.tsx`, `src/components/PropertyDetailPreview.tsx`, `src/lib/propertyPreview.ts`. Obsolete preview-only test files were replaced by `src/pages/LiveMarketplace.test.tsx`, which checks empty directories and actual returned agents. Shared-layout synthetic fixtures remain only inside tests, outside the production import graph.

No database records were deleted: the removed examples were local code, never real Supabase rows. No backend, authorization, moderation, financial gate, credential or deployment setting was changed.

Validation after removal: all **165 tests passed across 34 files**, application/tooling TypeScript passed, and production build passed. ESLint retains 264 existing errors and 19 warnings, with no new diagnostics. All 102 protected files match their original hashes. No removed preview implementation is referenced by production source. The search test was scoped to its results/filter regions after an earlier timeout; assertions and the five-second timeout remain unchanged.
