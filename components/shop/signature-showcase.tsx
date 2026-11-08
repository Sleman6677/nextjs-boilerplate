"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type TouchEvent } from "react";
import type { Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, t } from "@/lib/i18n/format";
import { useReducedMotion, MagnetLink } from "../fx";
import { useI18n } from "../i18n-provider";
import { ArrowForward } from "../icons";
import { SplitTitle } from "../split-title";
import { ProductImage } from "./product-card";

/* Ambient light behind the stage takes the colour of the box in front. */
const GLOW: Record<Product["art"]["tone"], string> = {
  petal: "rgba(248,215,223,0.55)",
  rose: "rgba(237,164,182,0.6)",
  blush: "rgba(232,196,184,0.55)",
  berry: "rgba(176,58,110,0.65)",
};

/* Coverflow slots: distance from the front card → placement. */
const SLOTS: Record<number, { x: number; scale: number; rot: number; opacity: number; z: number; dim: number }> = {
  0: { x: 0, scale: 1, rot: 0, opacity: 1, z: 30, dim: 1 },
  1: { x: 0.86, scale: 0.84, rot: -26, opacity: 0.7, z: 20, dim: 0.7 },
  2: { x: 1.55, scale: 0.68, rot: -40, opacity: 0.35, z: 10, dim: 0.5 },
};

/**
 * Signature edit: a 3D coverflow of the best sellers on a dark velvet stage.
 * Adapted from the 21st.dev "3D Coverflow Carousel" (dg.singh252525) to the
 * store's products, palette, fonts and right-to-left layouts.
 */
export function SignatureShowcase({ products, title, eyebrow }: { products: Product[]; title: string; eyebrow: string }) {
  const { lang, dict } = useI18n();
  const s = dict.store.home.showcase;
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(0);
  const total = products.length;
  const rtl = lang !== "en";

  const go = useCallback((i: number) => setActive(((i % total) + total) % total), [total]);
  const next = useCallback(() => go(active + 1), [go, active]);
  const prev = useCallback(() => go(active - 1), [go, active]);

  useEffect(() => {
    if (reduce || paused || total <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % total), 5200);
    return () => clearInterval(id);
  }, [reduce, paused, total]);

  if (total === 0) return null;
  const current = products[active];

  // Arrow keys follow the reading direction.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") (rtl ? prev : next)();
    if (e.key === "ArrowLeft") (rtl ? next : prev)();
  };
  const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) ((dx < 0) !== rtl ? next : prev)();
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={s.label}
      className="relative isolate overflow-hidden bg-[#140b10] py-16 text-ivory select-none sm:py-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKey}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Velvet stage: tinted light, vignette and a faint grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-1000"
        style={{ background: `radial-gradient(55% 60% at 50% 55%, ${GLOW[current.art.tone]} 0%, rgba(20,11,16,0) 70%)` }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(10,5,8,0.9)_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-black/50 to-transparent" />

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="eyebrow flex items-center justify-center gap-3 text-gold">
          <span className="h-px w-10 bg-gradient-to-l from-gold to-transparent" aria-hidden="true" />
          <span dir="auto">{eyebrow}</span>
          <span className="h-px w-10 bg-gradient-to-r from-gold to-transparent" aria-hidden="true" />
        </p>
        <SplitTitle className="font-display mt-5 text-center text-4xl sm:text-6xl" text={title} />

        {/* 3D stage */}
        <div className="relative mt-10 h-[26.5rem] [perspective:1400px] sm:h-[31rem]">
          {products.map((p, i) => {
            let d = (i - active + total) % total;
            if (d > total / 2) d -= total; // signed distance: -2 … 2
            const slot = SLOTS[Math.abs(d)];
            const front = d === 0;
            const name = localized(p.name, lang);
            const side = (d < 0 ? -1 : 1) * (rtl ? -1 : 1);
            const style: CSSProperties = slot
              ? {
                  transform: `translateX(calc(-50% + ${side * slot.x} * var(--card-w))) scale(${slot.scale}) rotateY(${side * slot.rot}deg)`,
                  opacity: slot.opacity,
                  zIndex: slot.z,
                  filter: front ? "none" : `brightness(${slot.dim})`,
                }
              : { transform: "translateX(-50%) scale(0.5)", opacity: 0, zIndex: 0, pointerEvents: "none" };

            const card = (
              <>
                <span className="block p-3 pb-0">
                  <ProductImage p={p} index={i} sizes="300px" />
                </span>
                <span className="relative block px-5 pt-4 pb-5 text-center">
                  <span className="block overflow-hidden">
                    <span className={`font-display block truncate text-2xl transition-transform duration-700 ease-[var(--ease-expo)] sm:text-[1.7rem] ${front ? "translate-y-0" : "translate-y-full"}`}>{name}</span>
                  </span>
                  <span className={`mx-auto mt-2 block h-px bg-gradient-to-r from-transparent via-gold to-transparent transition-[width] delay-150 duration-700 ${front ? "w-16" : "w-0"}`} aria-hidden="true" />
                  <span className="block overflow-hidden">
                    <span className={`font-display mt-2 block text-xl text-gold-soft transition-transform delay-100 duration-700 ease-[var(--ease-expo)] ${front ? "translate-y-0" : "translate-y-full"}`}>{money(p.displayPrice, lang)}</span>
                  </span>
                </span>
              </>
            );

            const shell = "absolute top-0 left-1/2 block w-[var(--card-w)] overflow-hidden rounded-[2rem] border bg-gradient-to-b from-[#2a1520] to-[#170c12] text-ivory transition-[transform,opacity,filter,box-shadow,border-color] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] [--card-w:15rem] sm:[--card-w:19rem]";
            return front ? (
              <div key={p.id} className={`${shell} border-gold/40 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95),0_0_60px_-10px_rgba(201,164,92,0.35)]`} style={style} aria-current="true">
                <Link href={href(lang, `/p/${p.slug}`)} className="block rounded-[2rem] focus-visible:outline-offset-4">
                  {card}
                  <span className="sr-only">{name}</span>
                </Link>
              </div>
            ) : (
              <button
                key={p.id}
                type="button"
                tabIndex={slot ? 0 : -1}
                aria-hidden={slot ? undefined : true}
                aria-label={t(s.go, { name })}
                onClick={() => go(i)}
                className={`${shell} cursor-pointer border-white/10 text-start shadow-[0_20px_40px_-20px_rgba(0,0,0,0.8)]`}
                style={style}
              >
                {card}
              </button>
            );
          })}

          {/* Arrows (logical: "previous" sits at the reading start) */}
          <div className="pointer-events-none absolute inset-x-0 top-[40%] z-40 flex justify-between px-0 sm:-mx-4">
            {[
              { label: s.prev, onClick: prev, flip: true },
              { label: s.next, onClick: next, flip: false },
            ].map((b) => (
              <button key={b.label} type="button" onClick={b.onClick} aria-label={b.label} className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-gold/30 bg-black/40 text-gold-soft backdrop-blur-md transition-colors hover:border-gold hover:bg-gold hover:text-ink">
                <ArrowForward className={`h-4 w-4 ${b.flip ? "rotate-180" : ""}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Dots + CTA */}
        <div className="mt-4 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2" role="group" aria-label={s.label}>
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(i)}
                aria-label={t(s.go, { name: localized(p.name, lang) })}
                aria-pressed={i === active}
                className={`h-2 rounded-full transition-all duration-300 ${i === active ? "w-8 bg-gold shadow-[0_0_12px_rgba(201,164,92,0.7)]" : "w-2 bg-white/25 hover:bg-white/50"}`}
              />
            ))}
          </div>
          <MagnetLink>
            <Link href={href(lang, `/p/${current.slug}`)} className="btn group bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[0_10px_30px_-10px_rgba(201,164,92,0.7)]">
              {s.cta}
              <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
            </Link>
          </MagnetLink>
        </div>
      </div>
    </section>
  );
}
