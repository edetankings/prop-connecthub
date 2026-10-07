# PROP-CONNECT Premium UI/UX Redesign (presentation only)

## Goal
Restyle the whole app into a serious, modern Nigerian property marketplace. The look should say "Discover, Connect, Inspect, Deal, Complete". Backend, data, payments, deals, inspections, AI and messaging logic stay exactly as they are. Routes are kept.

## Phases (each one is shipped and checked on mobile and desktop before the next)

1. **Design system**: refined green palette (deep forest to very light green, warm off-white, charcoal), gold kept for small verified/premium details only, a clear type scale (display to label), strong price styling, and consistent buttons, form fields and status badges. Fewer gradients, less glass, restrained shadows and corners.
2. **Public navigation and homepage**: a sticky nav that shrinks on scroll, linking to Buy, Rent, Land, Commercial, Agents and How It Works, plus Search, AI, Login and Get Started. Clean mobile menu drawer. The homepage gets marketplace categories, a "How it works" flow, buyer/agent sections, an AI showcase, and trust and safety content. All of it uses the real data already shown.
3. **Search, property details and agent profile**: filter drawer on mobile, better property cards, swipeable photos, a sticky action bar (Chat, Book Inspection, Buy/Rent) and a clearer agent trust panel.
4. **Buyer and agent dashboards**: compact working typography, cards in place of wide tables on mobile, skeleton loading, and helpful empty states.
5. **Messages, Deal Room and AI page**: cleaner chat layout, a clear deal progress tracker, and a tidier AI chat screen.
6. **Admin and waitlist screens**: consistent tables and filters, status badges, and mobile-friendly layouts.
7. **Final pass**: motion polish (subtle, respects reduced motion), accessibility (focus states, labels, touch targets), and no sideways scrolling. Then type check, lint and production build, plus a report of the pages and files changed.

## Rules
- No changes to database, security rules, sign-in, edge functions, payment, deal, inspection, messaging or AI logic.
- No new heavy dependencies. Reuse the existing UI components, Lucide icons, Motion and GSAP, which are already installed.
- No invented content or fake features. Where a section needs data that doesn't exist, it uses real data or a proper empty state.

## Technical details
- Tokens are updated in `src/index.css` and `tailwind.config.ts`, and button and badge variants are extended in shadcn. Components use semantic tokens only.
- New shared pieces: `PageHeader`, `StatusBadge`, `PriceTag`, `SectionHeading`, `EmptyState` (expanded), `CardSkeleton` and `FilterDrawer`.
- Nav links for Buy, Rent, Land and Commercial point to `/properties?type=...`. `Properties.tsx` reads that value into its existing filter state, which is a UI-only change.
