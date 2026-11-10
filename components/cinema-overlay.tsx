"use client";

import { useEffect, useRef } from "react";

/**
 * Editorial chrome over the WebGL stage:
 * - a five-line vertical grid (plus one horizontal rule under the header)
 *   whose dots drift as the page scrolls,
 * - a stories-style progress bar of four dashes on the last line,
 * - a double-ring cursor on mouse/trackpad devices (the inner dot follows
 *   the pointer exactly, the outer ring trails and widens over links).
 */
export function CinemaOverlay() {
  const grid = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const dots = Array.from(grid.current?.querySelectorAll<HTMLElement>("[data-dot]") ?? []);
    const fills = Array.from(grid.current?.querySelectorAll<HTMLElement>("[data-fill]") ?? []);

    let cx = window.innerWidth / 2,
      cy = window.innerHeight / 2,
      ox = cx,
      oy = cy;
    let raf = 0;

    if (fine) document.documentElement.classList.add("cinema-cursor");

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cx = e.clientX;
      cy = e.clientY;
      if (inner.current) inner.current.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      const hot = (e.target as Element | null)?.closest?.("a, button, [role=button], label, summary, input, select, textarea");
      outer.current?.classList.toggle("is-hot", Boolean(hot));
    };
    const onLeave = () => {
      inner.current?.style.setProperty("opacity", "0");
      outer.current?.style.setProperty("opacity", "0");
    };
    const onEnter = () => {
      inner.current?.style.removeProperty("opacity");
      outer.current?.style.removeProperty("opacity");
    };

    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const s = max > 0 ? window.scrollY / max : 0;
      dots.forEach((dot, i) => {
        const start = ((i * 17) % 80) + 10;
        let speed = 90 + ((i * 55) % 180);
        if (i % 2 === 0) speed = -speed;
        const y = (((start + s * speed) % 100) + 100) % 100;
        dot.style.top = `${y}%`;
      });
      fills.forEach((f, i) => {
        const p = Math.max(0, Math.min(1, (s - i * 0.25) / 0.25));
        f.style.transform = `scaleY(${p})`;
      });
      if (fine) {
        ox += (cx - ox) * (reduce ? 1 : 0.2);
        oy += (cy - oy) * (reduce ? 1 : 0.2);
        if (outer.current) outer.current.style.transform = `translate(${ox}px, ${oy}px) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    if (fine) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      document.documentElement.addEventListener("pointerenter", onEnter);
    }
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("cinema-cursor");
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
    };
  }, []);

  const line = (extra = "") => (
    <div className={`relative h-full w-px bg-white/[0.12] ${extra}`}>
      <span data-dot className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35" />
      <span data-dot className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35" />
    </div>
  );

  return (
    <>
      <div aria-hidden="true" ref={grid} className="pointer-events-none fixed inset-0 -z-[5] hidden md:block">
        <div className="absolute inset-x-0 top-[70px] h-px bg-white/[0.12]" />
        <div className="absolute inset-y-0 right-10 left-10 flex justify-between" dir="ltr">
          {line()}
          {line()}
          {line("mt-[70px] !h-[calc(100%-70px)]")}
          {line()}
          <div className="relative h-full w-px bg-white/[0.12]">
            <span data-dot className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35" />
            <span data-dot className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35" />
            <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 w-0.5 overflow-hidden rounded-full bg-white/15">
                  <div data-fill className="h-full w-full origin-top scale-y-0 rounded-full bg-white" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" ref={inner} className="cinema-cursor-inner pointer-events-none fixed top-0 left-0 z-[9999] hidden h-1.5 w-1.5 rounded-full border-2 border-white" />
      <div aria-hidden="true" ref={outer} className="cinema-cursor-outer pointer-events-none fixed top-0 left-0 z-[9998] hidden h-10 w-10 rounded-full border-[1.5px] border-white/70 transition-[width,height,background-color] duration-300" />
    </>
  );
}
