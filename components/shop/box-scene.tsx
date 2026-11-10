"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { LashPair } from "../lash-box";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const RISERS = [
  { left: "6%", style: "classic", map: "natural", rise: 40, rot: -8 },
  { left: "37%", style: "hybrid", map: "cat", rise: 95, rot: 0 },
  { left: "68%", style: "volume", map: "doll", rise: 40, rot: 8 },
] as const;

/**
 * The hero's box: it drops in from above on load, then opens as the page
 * scrolls. The real box photograph is the lid; it tips back on its top edge
 * to show the tray, and three lash pairs lift out. Progress comes from the
 * closest [data-box-scene] section (pinned on desktop, a short scroll on
 * phones). Reduced motion: the closed box, still.
 */
export function BoxScene({ alt }: { alt: string }) {
  const root = useRef<HTMLDivElement>(null);
  const lid = useRef<HTMLDivElement>(null);
  const risers = useRef<(HTMLDivElement | null)[]>([]);
  const rows = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const section = el?.closest<HTMLElement>("[data-box-scene]");
    if (
      !el ||
      !section ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let raf = 0;
    const render = () => {
      raf = 0;
      const vh = window.innerHeight;
      const pinned = window.innerWidth >= 1024;
      const range = pinned ? Math.max(1, section.offsetHeight - vh) : vh * 0.55;
      const p = clamp(-section.getBoundingClientRect().top / range);
      const open = clamp(p / 0.6); // lid: first 60% of the scroll
      const e = 1 - Math.pow(1 - open, 3);
      if (lid.current) {
        lid.current.style.transform = `translateY(${-5 * e}%) rotateX(${-84 * e}deg)`;
      }
      if (rows.current)
        rows.current.style.opacity = String(1 - 0.8 * clamp((p - 0.3) / 0.4));
      risers.current.forEach((r, i) => {
        if (!r) return;
        const q = clamp((p - 0.3 - i * 0.08) / 0.5);
        const k = 1 - Math.pow(1 - q, 3);
        r.style.opacity = String(Math.min(1, q * 3));
        r.style.transform = `translateY(${-RISERS[i].rise * k}%) rotate(${RISERS[i].rot * k}deg) scale(${0.8 + 0.3 * k})`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    render();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={root}
      className="box-fall relative aspect-[1344/960] w-full [perspective:1400px]"
    >
      {/* Open box: tray with rows of lashes */}
      <div
        className="absolute top-[10%] right-[3%] bottom-[7%] left-[3%] rounded-[14px] bg-copper p-[3.5%]"
        aria-hidden="true"
      >
        <div className="h-full rounded-[10px] bg-stone-2">
          <div
            ref={rows}
            className="grid h-full grid-cols-6 grid-rows-4 gap-[3%] p-[4%]"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <svg
                key={i}
                viewBox="0 0 40 20"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                className="h-full w-full text-kohl"
              >
                <path d="M4 6 Q20 17 36 6" strokeWidth="1.8" />
                {[8, 13, 18, 22, 27, 32].map((x) => {
                  const y = 6 + 5.5 * (1 - Math.pow((x - 20) / 16, 2));
                  return (
                    <path
                      key={x}
                      d={`M${x} ${y} l${(x - 20) * 0.12} 5.5`}
                      strokeWidth="1.2"
                    />
                  );
                })}
              </svg>
            ))}
          </div>
        </div>
        {RISERS.map((r, i) => (
          <div
            key={r.left}
            ref={(n) => void (risers.current[i] = n)}
            className="absolute top-[48%] w-[26%] text-kohl opacity-0 will-change-transform"
            style={{ left: r.left }}
          >
            <LashPair style={r.style} map={r.map} seed={4 + i} />
          </div>
        ))}
      </div>
      {/* Lid: the real box photograph, hinged on its top edge */}
      <div
        ref={lid}
        className="absolute inset-0 origin-[50%_9%] will-change-transform"
      >
        <Image
          src="/images/serag-lashes-box.jpg"
          alt={alt}
          width={1344}
          height={960}
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
