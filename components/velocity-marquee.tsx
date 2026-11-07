"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";

gsap.registerPlugin(useGSAP);

/**
 * An endless strip of text that speeds up — and flips direction — with the
 * scroll velocity Lenis reports. Static (no movement) when motion is reduced.
 */
export function VelocityMarquee({ items, className = "", base = 40 }: { items: string[]; className?: string; base?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const boost = useRef(0);
  const dirRef = useRef(1);

  useLenis(({ velocity }) => {
    boost.current = velocity;
    if (Math.abs(velocity) > 0.5) dirRef.current = velocity > 0 ? 1 : -1;
  });

  useGSAP(
    () => {
      const el = track.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let x = 0;
      const tick = (_t: number, dt: number) => {
        const half = el.scrollWidth / 2;
        if (!half) return;
        const speed = (base + Math.min(Math.abs(boost.current) * 18, 900)) * dirRef.current;
        boost.current *= 0.92;
        x -= (speed * dt) / 1000;
        x = gsap.utils.wrap(-half, 0, x);
        gsap.set(el, { x });
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: root },
  );

  const row = (copy: number) =>
    items.map((t, i) => (
      <span key={`${copy}-${i}`} className="flex shrink-0 items-center gap-8 pe-8">
        <span>{t}</span>
        <span aria-hidden="true" className="text-[0.5em] text-gold">✦</span>
      </span>
    ));

  return (
    <div ref={root} className={`overflow-hidden ${className}`} dir="ltr" aria-label={items.join(" · ")} role="marquee">
      <div ref={track} className="flex w-max will-change-transform" aria-hidden="true">
        {Array.from({ length: 6 }, (_, c) => row(c))}
      </div>
    </div>
  );
}
