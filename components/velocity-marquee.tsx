"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";

gsap.registerPlugin(useGSAP);

/** A closed eye with lashes, the brand mark, as the separator between phrases. */
function LashMark() {
  return (
    <svg viewBox="0 0 40 20" aria-hidden="true" className="h-[0.5em] w-[1em] shrink-0 text-gold" fill="none" stroke="currentColor" strokeLinecap="round">
      <path d="M3 6 Q20 18 37 6" strokeWidth="2" />
      {[8, 14, 20, 26, 32].map((x, i) => {
        const y = 6 + 12 * (1 - Math.pow((x - 20) / 17, 2)) * 0.5;
        return <path key={x} d={`M${x} ${y} L${x + (i - 2) * 1.6} ${y + 6}`} strokeWidth="1.6" />;
      })}
    </svg>
  );
}

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
        <LashMark />
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
