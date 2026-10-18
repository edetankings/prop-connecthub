# Cinematic property inspection showcase

Status: implemented locally; moved directly after the “Room for the life you are building” category section. The visible playback panel, scene buttons and their explanatory copy have been removed at the owner’s request. The sequence plays automatically once when entering view, pauses offscreen, and retains a static reduced-motion fallback. Earlier implementation details below describe the original controls and are superseded by this update. Browser visual acceptance and live application acceptance remain separate.

## Existing section and reference

The existing `Your Next Chapter Starts Here` section was a static heading, copy and navigation buttons in `src/pages/Index.tsx`, identified by `data-home-section="final-cta"`. It is replaced in that position by `InspectionShowcase`; no additional homepage section or route is added. The supplied six-scene motion storyboard guides the composition, forest-green palette, titanium-style device, Dynamic Island, mobile screen layouts, architectural photography and closing CTA. The storyboard image is not embedded as a substitute for UI.

The existing app uses React/TypeScript, GSAP and ScrollTrigger. Property detail inspection requests use full name, preferred date, preferred time and a message; the professional must confirm availability. The showcase represents those fields without importing or mounting the operational form.

## Device and creative implementation

The device is a CSS representation inspired by the iPhone 16 Pro Max: a tall 440:956 display ratio, warm titanium-style gradient rim and highlights, rounded clipped display, narrow bezel, Dynamic Island, side controls, home indicator and soft environmental shadows. No Apple logo or endorsement is used. It is not a physical-device accuracy certification.

A dark forest-green architectural environment, sage CTA, restrained perspective and editorial typography replace the static CTA layout. Desktop balances text and phone side by side. Phones stack copy, CTA, scaled device and controls. The phone UI is rebuilt from HTML, text, SVG icons and individual images, not a desktop screenshot, video or storyboard montage. No Three.js or other dependency was added.

## Six scenes

| Time | Scene | Local presentation |
| --- | --- | --- |
| 0–3s | App launch | Perspective entrance and illuminated brand reveal with architectural imagery |
| 3–7s | Property discovery | Public listing photos/prices/location, natural list movement and simulated tap |
| 7–11s | Property details | Main photograph, gallery transition, actual supplied specifications and inspection action emphasis |
| 11–17s | Inspection request | Full-name preview, preferred date/time selection, optional message and simulated submit tap |
| 17–21s | Request submitted | Local success animation and explicit explanation that a request is not an automatically confirmed viewing |
| 21–24s | Final CTA | Device settles into the closing branded screen; the real Explore Properties link remains available outside the phone |

The timeline runs once when the section enters view. It pauses offscreen and in hidden tabs, resumes unfinished playback and stays finished on later re-entry. Users can pause, resume, replay or select any scene. Selecting a scene pauses playback. GSAP contexts, timelines, ScrollTrigger and the visibility listener are cleaned up on unmount/preference changes. There is no long pinned scroll region or page-scroll interception.

## Real data and demonstration boundary

The component receives the already-loaded public property list from the homepage. It makes **no network request** and imports no Supabase client, authentication hook, booking function or financial module. Supplied listing title, price, description, image URLs, location and specifications are used without inventing verification or ownership assertions. Missing images use the neutral placeholder. A one-image listing does not claim a multi-image gallery.

When no suitable public content is supplied, the visual uses explicitly disclosed sample property/pricing and existing category/architectural imagery. These are illustrative concepts, not newly created database listings. No real record is created.

All phone fields/actions are inert presentation spans, not operational form controls. The whole decorative phone is hidden from assistive technology. Dates are illustrative upcoming dates, not returned availability slots; the selected preferred date/time is consistent between request and confirmation previews. The name is a local `Demo viewer`, not an authenticated identity. Nothing submits, books, sends a message, triggers notifications, charges funds or changes authentication.

The real external CTA links to the existing `/properties` route. It is available throughout the sequence and does not initiate a booking. Existing routes and booking business logic are unchanged.

## Accessibility and responsive behavior

Reduced-motion users receive a static final composition with selectable, non-animated scene previews and accessible descriptions. Autoplay/pause/replay controls are omitted in that mode. Decorative phone UI cannot become a fake keyboard form. Visible external scene controls have accessible names, pressed states, focus indicators and descriptive text. Automatic scene changes are not live-announced repeatedly.

CSS provides a desktop two-column composition, stacked phone layout, three-column mobile scene controls, bounded device size and touch-sized actions. Fixed device proportions and reserved media areas limit layout shifts. Image decoding is asynchronous and images are lazy-loaded; existing local architectural/category assets are reused. The 24-second timeline uses transforms/opacity for large elements, with small date/time colour changes. No continuous WebGL rendering or autoplay loop is introduced.

Required visual widths: **320, 360, 375, 390, 430, 768, 1024 and 1440px**. Browser connection returned `No browser is available`. No screenshots or real-device claims are made. Typography, phone clipping, perspective, contrast, scene timing and mobile touch behavior need rendered review at every required width. CSS/type/unit checks do not establish visual acceptance.

## Files

Modified:

- `src/pages/Index.tsx`: replace the existing final CTA in place; pass existing public listing data.
- `src/index.css`: import the scoped showcase stylesheet.

Added:

- `src/components/home/InspectionShowcase.tsx`: isolated scenes, demonstration state, timeline and playback lifecycle.
- `src/components/home/InspectionShowcase.test.tsx`: content, scene controls, public-data handling, no-remote-operation boundary, real local timeline/cleanup and reduced-motion checks.
- `src/styles/inspection-showcase.css`: scoped cinematic device, screen UI and responsive composition.
- This report.

No existing files were deleted and no dependency was installed. No environment, Supabase configuration, migration, Auth implementation, RLS, role, Edge Function, financial lock or real inspection form was modified.

## Validation

| Check | Result |
| --- | --- |
| Application TypeScript | Passed (`tsc --noEmit -p tsconfig.app.json`) |
| Tooling TypeScript | Passed (`tsc --noEmit -p tsconfig.node.json`) |
| Full automated suite | Passed: 147 tests across 27 files; no failures or timeouts |
| Showcase tests | Passed: five tests, including real local GSAP timeline lifecycle and reduced motion |
| Production build | Passed; existing large-chunk and outdated Browserslist-data warnings remain |
| ESLint | Fails on existing 266 errors and 19 warnings, identical diagnostic inventory to the pre-change checkpoint; no new diagnostics |
| Protected files | All 102 match the original protected checkpoint hashes |
| Existing-file integrity | Only `src/pages/Index.tsx` and `src/index.css` changed; no existing file deleted |
| CSS parsing / whitespace | PostCSS parsing and `git diff --check` passed |
| Rendered browser review | Pending: no browser available; eight requested viewport widths have not been visually verified |

Validation completed locally on 18 October 2026. Git shows two modified files and four new files listed above; the worktree was clean at the task checkpoint. The build regenerated SEO artifacts without changing their contents.

Focused verification includes advancing the actual local GSAP timeline to the request-submitted scene, pausing on viewport exit, resuming on re-entry, staying at the final frame after completion, and checking ScrollTrigger cleanup. The viewport event driver is controlled in the unit test; this is not a browser screenshot or a real booking test. The no-write tests visit all six controls and assert no Supabase reads, RPCs or function invocations. The full phone contains no forms, inputs, selects, buttons or anchors capable of submitting an operation.

Machine-readable lint/test results and integrity snapshots are local under `.git/showcase-checkpoint/`. No live SQL, booking, upload, notification, role change, account operation or deployment was executed. No commit or push command was run.

## Remaining limitations

- Rendered acceptance at all required widths and actual device/browser performance testing remain pending a browser connection.
- A real listing with only one image retains that image through the gallery movement rather than fabricating additional photographs.
- The sample fallback remains explicitly illustrative and does not establish available stock, ownership verification or appointment slots.
- This presentation does not validate deployed booking permissions, message delivery, private documents or financial readiness. Those remain separately authorized application acceptance work.
