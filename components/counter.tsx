"use client";

import { useEffect, useRef } from "react";
import { num } from "@/lib/i18n/format";
import { useI18n } from "./i18n-provider";

/**
 * Renders the final number on the server (readable without JS),
 * then counts up once when scrolled into view.
 */
export function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { lang } = useI18n();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    el.textContent = num(0, lang) + suffix;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const duration = 1600;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = num(Math.round(value * eased), lang) + suffix;
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
      el.textContent = num(value, lang) + suffix;
    };
  }, [value, suffix, lang]);

  return (
    <span ref={ref} className="tabular-nums">
      {num(value, lang)}
      {suffix}
    </span>
  );
}
