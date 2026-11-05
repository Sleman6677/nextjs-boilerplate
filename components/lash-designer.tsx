"use client";

import { useState } from "react";
import type { LashMap, LashStyle } from "@/lib/lash";
import { lashMaps, styleLabel } from "@/lib/site";
import { LashEye } from "./art";

const styles: LashStyle[] = ["classic", "hybrid", "volume", "mega"];

/** "Design your look": pick a style + a lash map and watch the eye redraw. */
export function LashDesigner() {
  const [style, setStyle] = useState<LashStyle>("hybrid");
  const [map, setMap] = useState<LashMap>("cat");
  const current = lashMaps.find((m) => m.id === map)!;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-8">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-ivory/80">١. النمط</legend>
          <div className="flex flex-wrap gap-2">
            {styles.map((s) => (
              <label key={s} className="relative">
                <input
                  type="radio"
                  name="lash-style"
                  value={s}
                  checked={style === s}
                  onChange={() => setStyle(s)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 items-center rounded-full border border-gold/25 px-5 text-sm text-ivory/85 transition-colors duration-200 peer-checked:border-gold peer-checked:bg-gold peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-gold-soft hover:border-gold/60">
                  {styleLabel[s]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-ivory/80">٢. خريطة الرموش</legend>
          <div className="grid grid-cols-2 gap-2">
            {lashMaps.map((m) => (
              <label key={m.id} className="relative">
                <input
                  type="radio"
                  name="lash-map"
                  value={m.id}
                  checked={map === m.id}
                  onChange={() => setMap(m.id)}
                  className="peer sr-only"
                />
                <span className="flex min-h-14 flex-col justify-center rounded-2xl border border-gold/20 px-4 py-3 transition-colors duration-200 peer-checked:border-gold peer-checked:bg-gold/10 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-soft hover:border-gold/50">
                  <span className="text-ivory">{m.name}</span>
                  <span className="font-display text-sm text-gold-soft/80" dir="ltr">
                    {m.latin}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="min-h-16 text-ivory/75" aria-live="polite">
          <span className="text-gold-soft">{styleLabel[style]} · {current.name}: </span>
          {current.text}
        </p>
      </div>

      <div className="relative">
        <div className="arch relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden border border-gold/25 bg-gradient-to-b from-ink-3 to-ink">
          <div className="glow absolute inset-x-0 top-10 mx-auto h-72 w-72 opacity-70" aria-hidden="true" />
          <div className="absolute inset-0 grid place-items-center px-8 text-gold-soft">
            <LashEye
              key={`${style}-${map}`}
              style={style}
              map={map}
              draw
              baseDelay={0}
              className="w-full"
              label={`رسم لعين بنمط ${styleLabel[style]} وخريطة ${current.name}`}
            />
          </div>
          <p className="font-display absolute inset-x-0 bottom-8 text-center text-sm tracking-[0.3em] text-gold/80" dir="ltr">
            {current.latin.toUpperCase()} MAP
          </p>
        </div>
      </div>
    </div>
  );
}
