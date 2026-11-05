"use client";

import { useId, useState } from "react";
import { num, t } from "@/lib/i18n/format";
import { useI18n } from "./i18n-provider";
import { LashEye } from "./art";

export function BeforeAfter({ className }: { className?: string }) {
  const { lang, dict } = useI18n();
  const b = dict.beforeAfter;
  const [value, setValue] = useState(50);
  const id = useId();

  return (
    <div className={`relative ${className ?? ""}`}>
      <div dir="ltr" className="relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-ink select-none">
        <div className="glow pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />

        {/* After (full) */}
        <div className="absolute inset-0 grid place-items-center p-6 text-gold-soft sm:p-12">
          <LashEye style="volume" map="cat" seed={3} className="w-full max-w-xl" lidWidth={2.6} />
        </div>

        {/* Before (clipped from the left) */}
        <div
          className="absolute inset-0 grid place-items-center bg-ink-2 p-6 text-mist sm:p-12"
          style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
          aria-hidden="true"
        >
          <LashEye style="natural" map="natural" seed={3} className="w-full max-w-xl" lidWidth={2.6} />
        </div>

        <label htmlFor={id} className="sr-only">
          {b.label}
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-valuetext={t(b.value, { value: num(value, lang) })}
          className="compare-range peer absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />

        <span className="eyebrow pointer-events-none absolute top-5 left-5 rounded-full bg-ink/70 px-3 py-1 text-ivory/80">{b.before}</span>
        <span className="eyebrow pointer-events-none absolute top-5 right-5 rounded-full bg-gold/90 px-3 py-1 text-ink">{b.after}</span>

        {/* Handle (follows the input so it can react to keyboard focus) */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-gold-soft peer-focus-visible:[&>span]:ring-2 peer-focus-visible:[&>span]:ring-gold-soft peer-focus-visible:[&>span]:ring-offset-2 peer-focus-visible:[&>span]:ring-offset-ink"
          style={{ left: `${value}%` }}
          aria-hidden="true"
        >
          <span className="absolute top-1/2 left-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold-soft bg-ink text-gold-soft shadow-lg">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
            </svg>
          </span>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-taupe">
        {b.caption}
      </p>
    </div>
  );
}
