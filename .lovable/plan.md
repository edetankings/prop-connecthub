# Premium Motion Pass for Public Pages

## Goal
Add a polished, subtle motion system across PROP-CONNECT’s public experience without changing its layout, content, data, or workflows.

## What will change
- Add GSAP with ScrollTrigger for smooth scroll-linked reveals and image depth effects.
- Keep Motion for React for component entrances, page transitions, filtering results, galleries, and interactive feedback.
- Animate the public navigation and mobile menu with restrained transitions.
- Improve the homepage with staggered section reveals, subtle image parallax, animated statistics, and smoother carousel feedback.
- Animate the Properties and Agents pages as real data loads, filters, and cards appear.
- Add refined gallery, content, map, and sidebar entrances to Property Detail and Agent Profile pages.
- Apply consistent reveal motion to Trust & Safety information pages and the footer.
- Respect reduced-motion preferences and disable expensive effects on users or devices that request less motion.

## Motion character
- Premium and restrained: soft fades, short vertical movement, gentle scale, and subtle depth.
- No distracting looping decoration, aggressive cursor effects, or layout changes.
- Mobile motion will be lighter than desktop motion to preserve responsiveness and performance.

## Technical details
- Create reusable public-page motion wrappers and a GSAP scroll-reveal hook instead of duplicating animation logic.
- Register and clean up ScrollTrigger correctly within React component lifecycles.
- Use transforms and opacity for smooth performance; avoid animations that trigger layout shifts.
- Preserve existing links, forms, live property data, authentication behavior, and SEO markup.
- Validate the homepage, property listing, property detail, agents, and Trust & Safety pages at desktop and the current narrow viewport.
