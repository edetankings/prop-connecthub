import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PRIVATE = ["/dashboard", "/admin", "/messages", "/chat", "/settings", "/deal", "/ai", "/secure-payment"];
const SELECTOR = "section, footer, [data-reveal], .grid > a, .grid > div";

/** Premium-subtle scroll reveals for public pages, using GSAP ScrollTrigger. */
const MotionReveal = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/") return; // Homepage owns its scoped, opt-in motion.
    if (PRIVATE.some((p) => pathname.startsWith(p))) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mobile = window.innerWidth < 768;
    const ctx = gsap.context(() => {});

    const scan = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => !el.dataset.revealed && !el.closest("nav, [role=dialog], .leaflet-container")
      );
      if (!els.length) return;
      els.forEach((el) => (el.dataset.revealed = "1"));
      ctx.add(() => {
        ScrollTrigger.batch(els, {
          start: "top 92%",
          once: true,
          onEnter: (batch) =>
            gsap.fromTo(
              batch,
              { autoAlpha: 0, y: mobile ? 14 : 28 },
              { autoAlpha: 1, y: 0, duration: mobile ? 0.5 : 0.8, ease: "power3.out", stagger: 0.08, clearProps: "transform,opacity,visibility" }
            ),
        });
        document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((img) => {
          if (mobile || img.dataset.px) return;
          img.dataset.px = "1";
          gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: img, scrub: true } });
        });
      });
    };

    let t: number | undefined;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(scan, 120);
    });
    const start = window.setTimeout(scan, 60);
    mo.observe(document.getElementById("root")!, { childList: true, subtree: true });

    return () => {
      clearTimeout(start);
      clearTimeout(t);
      mo.disconnect();
      ctx.revert();
      document.querySelectorAll<HTMLElement>("[data-revealed]").forEach((el) => {
        delete el.dataset.revealed;
        el.style.opacity = "";
        el.style.visibility = "";
        el.style.transform = "";
      });
    };
  }, [pathname]);

  return null;
};

export default MotionReveal;
