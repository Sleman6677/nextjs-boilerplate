"use client";

import { useEffect, useRef } from "react";
import { arDigits } from "@/lib/site";

/**
 * Renders the final number on the server (readable without JS),
 * then counts up once when scrolled into view.
 */
export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    el.textContent = arDigits(0) + suffix;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1600;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = arDigits(Math.round(value * eased)) + suffix;
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = arDigits(value) + suffix;
    };
  }, [value, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      {arDigits(value)}
      {suffix}
    </span>
  );
}
