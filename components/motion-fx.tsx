"use client";

import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Site-wide GSAP scroll effects, opted into with data attributes so pages
 * stay server components:
 *   data-parallax="0.2"   moves against the scroll (fraction of its height)
 *   data-hero-out         fades and lifts away as the hero scrolls off
 *   data-drift="-15"      slides sideways by that many % while in view
 *   data-scroll-tilt      straightens and lifts while it crosses the viewport
 *   data-zoom-in          image settles from 1.15 to 1 while in view
 *   data-stagger          direct children rise in, batched as they enter
 *   data-lash-draw        lash strokes (pathLength=1) draw on as it enters
 * Re-runs on every route change; does nothing when motion is reduced.
 */
export function MotionFx() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rtl = document.documentElement.dir === "rtl";

        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
          const speed = parseFloat(el.dataset.parallax || "0.2");
          gsap.fromTo(el, { yPercent: -speed * 50 }, { yPercent: speed * 50, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
        });

        gsap.utils.toArray<HTMLElement>("[data-hero-out]").forEach((el) => {
          gsap.to(el, { yPercent: -18, opacity: 0.15, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
        });

        gsap.utils.toArray<HTMLElement>("[data-drift]").forEach((el) => {
          const dist = parseFloat(el.dataset.drift || "-15") * (rtl ? -1 : 1);
          gsap.fromTo(el, { xPercent: 0 }, { xPercent: dist, ease: "none", scrollTrigger: { trigger: el.parentElement ?? el, start: "top top", end: "bottom top", scrub: true } });
        });

        gsap.utils.toArray<HTMLElement>("[data-scroll-tilt]").forEach((el) => {
          gsap.fromTo(el, { rotate: -14, y: 80, scale: 0.92 }, { rotate: 4, y: -30, scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
        });

        gsap.utils.toArray<HTMLElement>("[data-zoom-in]").forEach((el) => {
          gsap.fromTo(el, { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "center center", scrub: true } });
        });

        gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((list) => {
          const items = Array.from(list.children) as HTMLElement[];
          gsap.set(items, { y: 50, opacity: 0 });
          ScrollTrigger.batch(items, {
            start: "top 92%",
            once: true,
            onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.09, overwrite: true }),
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-lash-draw]").forEach((el) => {
          const paths = el.querySelectorAll("path");
          if (!paths.length) return;
          gsap.fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.3, ease: "power2.out", stagger: { amount: 0.6, from: "center" }, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        });

        // Layout settles after fonts/images; re-measure once it has.
        const refresh = () => ScrollTrigger.refresh();
        window.addEventListener("load", refresh);
        document.fonts?.ready.then(refresh);
        return () => window.removeEventListener("load", refresh);
      });
      return () => mm.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
