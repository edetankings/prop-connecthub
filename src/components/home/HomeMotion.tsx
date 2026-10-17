import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Opt-in, scoped motion; markup remains visible if animation cannot run. */
export default function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const heroEntrance = gsap.timeline();
        heroEntrance.from("[data-architecture-reveal]", { scale: 1.09, opacity: .45, duration: 1.8, ease: "power2.out", clearProps: "transform,opacity" }, 0);
        heroEntrance.from("[data-hero-reveal]", { y: 24, opacity: 0, duration: .85, stagger: .15, ease: "power3.out", clearProps: "transform,opacity" }, .15);
        gsap.utils.toArray<HTMLElement>("[data-section-reveal]").forEach((element) => {
          gsap.from(element, { y: 14, opacity: .7, duration: .65, ease: "power2.out", clearProps: "all",
            scrollTrigger: { trigger: element, start: "top 94%", once: true } });
        });
        gsap.utils.toArray<HTMLElement>("[data-category-reveal]").forEach((element, index) => {
          gsap.from(element, { x: index % 2 === 0 ? -18 : 18, y: 24, opacity: 0, duration: .65, delay: (index % 2) * .12, ease: "power3.out", clearProps: "transform,opacity",
            scrollTrigger: { trigger: element, start: "top 92%", once: true } });
        });
        gsap.from("[data-journey-step]", { opacity: .7, y: 14, duration: .6, stagger: .13, clearProps: "opacity,transform",
          scrollTrigger: { trigger: "[data-home-section=journey]", start: "top 80%", once: true } });
        gsap.utils.toArray<HTMLElement>("[data-image-mask]").forEach(element => {
          gsap.from(element, { clipPath: "inset(6% 0 6% 0 round 28px)", duration: .9, ease: "power2.out", clearProps: "clipPath",
            scrollTrigger: { trigger: element, start: "top 90%", once: true } });
        });
      }, root);
      return () => context.revert();
    });
    media.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.to(".hero-visual", { yPercent: 6, ease: "none", scrollTrigger: { trigger: "[data-home-section=hero]", start: "top top", end: "bottom top", scrub: .8 } });
        gsap.to("[data-soft-parallax]", { yPercent: 3, ease: "none", scrollTrigger: { trigger: "[data-home-section=experience]", start: "top bottom", end: "bottom top", scrub: .8 } });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return <div ref={root} className="min-w-0">{children}</div>;
}
