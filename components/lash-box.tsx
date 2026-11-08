import Image from "next/image";
import type { CSSProperties } from "react";
import type { LashMap, LashStyle } from "@/lib/lash";
import type { LashBox } from "@/lib/site";
import { LashEye, Monogram } from "./art";
import { Sparkle } from "./icons";

/** A pair of strip lashes lying in a tray (outer corners pointing outward). */
export function LashPair({
  style,
  map,
  seed = 5,
  className,
}: {
  style: LashStyle;
  map: LashMap;
  seed?: number;
  className?: string;
}) {
  return (
    <div dir="ltr" className={`flex items-center justify-center gap-[5%] ${className ?? ""}`} aria-hidden="true">
      <div className="w-[47%]" style={{ transform: "scale(-1,-1)" }}>
        <LashEye style={style} map={map} seed={seed} showCrease={false} lidWidth={5} className="w-full" />
      </div>
      <div className="w-[47%]" style={{ transform: "scale(1,-1)" }}>
        <LashEye style={style} map={map} seed={seed} showCrease={false} lidWidth={5} className="w-full" />
      </div>
    </div>
  );
}

const tones: Record<LashBox["tone"], { box: string; tray: string; lashes: string; lid: string; label: string }> = {
  petal: {
    box: "bg-gradient-to-b from-[#fff7f9] to-pink-soft",
    tray: "bg-ivory",
    lashes: "text-plum",
    lid: "bg-berry text-ivory",
    label: "text-berry",
  },
  rose: {
    box: "bg-gradient-to-b from-pink-soft to-pink",
    tray: "bg-petal",
    lashes: "text-berry-deep",
    lid: "bg-ivory text-berry",
    label: "text-berry-deep",
  },
  blush: {
    box: "bg-gradient-to-b from-blush to-[#e7c4bb]",
    tray: "bg-ivory",
    lashes: "text-cocoa",
    lid: "bg-berry-deep text-pink-soft",
    label: "text-cocoa",
  },
  berry: {
    box: "bg-gradient-to-b from-berry to-berry-deep",
    tray: "bg-plum",
    lashes: "text-pink-soft",
    lid: "bg-pink text-plum",
    label: "text-pink-soft",
  },
};

/** Product visual: a lash box whose lid lifts on hover/focus. */
export function BoxVisual({
  art,
  label,
  imageUrl,
  index = 0,
}: {
  art: { style: LashStyle; map: LashMap; tone: LashBox["tone"] };
  label: string;
  imageUrl?: string | null;
  index?: number;
}) {
  const t = tones[art.tone];
  return (
    <div className={`relative aspect-[4/5] overflow-hidden rounded-[2rem] ${t.box}`}>
      {[
        { top: "38%", left: "8%", d: 0 },
        { top: "70%", left: "88%", d: 900 },
        { top: "86%", left: "14%", d: 1700 },
      ].map((s, i) => (
        <Sparkle
          key={i}
          className={`twinkle absolute h-3 w-3 ${t.label} opacity-60`}
          style={{ top: s.top, left: s.left, "--d": `${s.d + index * 300}ms` } as CSSProperties}
        />
      ))}

      <div data-lash-draw={imageUrl ? undefined : ""} className={`absolute inset-x-6 top-[32%] bottom-[17%] grid place-items-center rounded-[1.4rem] ${t.tray} shadow-[inset_0_2px_14px_rgba(75,21,48,0.12)]`}>
        {imageUrl ? (
          <span className="card-lashes absolute inset-2 overflow-hidden rounded-[1.1rem]">
            <Image src={imageUrl} alt="" fill unoptimized sizes="(min-width:1024px) 30vw, 90vw" className="object-cover" />
          </span>
        ) : (
          <LashPair style={art.style} map={art.map} seed={index + 3} className={`card-lashes w-[86%] ${t.lashes}`} />
        )}
      </div>

      <div className={`card-lid absolute inset-x-4 top-4 flex h-[23%] flex-col items-center justify-center rounded-[1.4rem] shadow-[0_14px_30px_-16px_rgba(44,13,28,0.55)] ${t.lid}`}>
        <span className="font-display text-2xl leading-none italic" dir="ltr">
          Serag
        </span>
        <span className="font-display mt-1 text-[0.6rem] tracking-[0.45em]" dir="ltr">
          DAILY LASHES
        </span>
      </div>

      <span className={`font-display absolute inset-x-0 bottom-5 text-center text-sm tracking-[0.3em] ${t.label}`} dir="ltr">
        {label.toUpperCase()}
      </span>
    </div>
  );
}

const heroSparkles = [
  { top: "6%", left: "70%", size: "h-5 w-5", d: 0 },
  { top: "30%", left: "92%", size: "h-3 w-3", d: 700 },
  { top: "62%", left: "-2%", size: "h-4 w-4", d: 1300 },
  { top: "90%", left: "80%", size: "h-3 w-3", d: 400 },
  { top: "18%", left: "14%", size: "h-3 w-3", d: 1900 },
];

/** Signature hero animation: the box lid opens, lashes rise, the price tag swings in. */
export function HeroBox({ label, tag, price }: { label: string; tag: string; price: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[26rem]">
      <div className="glow-pink box-glow absolute inset-[-18%] opacity-90" aria-hidden="true" />

      {heroSparkles.map((s, i) => (
        <Sparkle
          key={i}
          className={`twinkle absolute ${s.size} text-pink-soft`}
          style={{ top: s.top, left: s.left, "--d": `${s.d}ms` } as CSSProperties}
        />
      ))}

      <div className="box-scene relative aspect-[5/4.4]" role="img" aria-label={label}>
        {/* Base */}
        <div className="absolute inset-x-0 bottom-0 h-[62%] rounded-[1.8rem] bg-gradient-to-b from-pink-soft via-pink to-pink-deep p-[5%] shadow-[0_40px_80px_-30px_rgba(20,4,12,0.8)]">
          <div className="grid h-full place-items-center rounded-[1.3rem] bg-petal shadow-[inset_0_4px_20px_rgba(75,21,48,0.18)]">
            <LashPair style="hybrid" map="doll" seed={8} className="box-lashes w-[88%] text-berry-deep" />
          </div>
          <span className="font-display absolute inset-x-0 -bottom-8 text-center text-xs tracking-[0.45em] text-pink-soft/80" dir="ltr">
            SERAG · DAILY
          </span>
        </div>

        {/* Lid (on top so the box starts closed) */}
        <div className="box-lid absolute inset-x-0 bottom-0 flex h-[62%] flex-col items-center justify-center rounded-[1.8rem] bg-gradient-to-b from-[#f9c7d4] to-pink text-plum shadow-[0_20px_50px_-25px_rgba(20,4,12,0.7)]">
          <Monogram className="h-12 w-12 text-berry" />
          <span className="font-display mt-2 text-4xl italic" dir="ltr">
            Serag
          </span>
          <span className="font-display mt-1 text-[0.7rem] tracking-[0.5em] text-berry" dir="ltr">
            DAILY LASHES
          </span>
        </div>
      </div>

      {/* Price tag */}
      <div className="price-tag absolute -end-4 -bottom-[14%] flex flex-col items-center sm:-end-10" aria-hidden="true">
        <span className="h-12 w-px bg-pink-soft/60" />
        <span className="relative rounded-2xl bg-ivory px-5 pt-5 pb-3 text-center shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
          <span className="absolute top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-pink-deep/50" />
          <span className="block text-xs text-berry">{tag}</span>
          <span className="font-display block text-3xl leading-tight text-plum">
            {price}
          </span>
        </span>
      </div>
    </div>
  );
}
