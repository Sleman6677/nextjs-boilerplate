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
    box: "bg-white border border-mist-gray",
    tray: "bg-[#f6f6f6]",
    lashes: "text-graphite",
    lid: "bg-graphite text-white",
    label: "text-graphite",
  },
  rose: {
    box: "bg-[#f6f6f6]",
    tray: "bg-white",
    lashes: "text-graphite",
    lid: "bg-ember text-white",
    label: "text-graphite",
  },
  blush: {
    box: "bg-[#fff1ec]",
    tray: "bg-white",
    lashes: "text-graphite",
    lid: "bg-white text-ember border-[1.5px] border-apricot",
    label: "text-graphite",
  },
  berry: {
    box: "bg-inkwell",
    tray: "bg-ink-3",
    lashes: "text-white",
    lid: "bg-ember text-white",
    label: "text-white/80",
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
    <div className={`relative aspect-[4/5] overflow-hidden rounded-[15px] ${t.box}`}>
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

      <div data-lash-draw={imageUrl ? undefined : ""} className={`absolute inset-x-6 top-[32%] bottom-[17%] grid place-items-center rounded-[10px] ${t.tray}`}>
        {imageUrl ? (
          <span className="card-lashes absolute inset-2 overflow-hidden rounded-[1.1rem]">
            <Image src={imageUrl} alt="" fill unoptimized sizes="(min-width:1024px) 30vw, 90vw" className="object-cover" />
          </span>
        ) : (
          <LashPair style={art.style} map={art.map} seed={index + 3} className={`card-lashes w-[86%] ${t.lashes}`} />
        )}
      </div>

      <div className={`card-lid absolute inset-x-4 top-4 flex h-[23%] flex-col items-center justify-center rounded-[10px] ${t.lid}`}>
        <span className="font-display text-2xl leading-none font-light" dir="ltr">
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
          className={`twinkle absolute ${s.size} text-apricot`}
          style={{ top: s.top, left: s.left, "--d": `${s.d}ms` } as CSSProperties}
        />
      ))}

      <div className="box-scene relative aspect-[5/4.4]" role="img" aria-label={label}>
        {/* Base */}
        <div className="absolute inset-x-0 bottom-0 h-[62%] rounded-[15px] bg-ember p-[5%]">
          <div className="grid h-full place-items-center rounded-[10px] bg-white">
            <LashPair style="hybrid" map="doll" seed={8} className="box-lashes w-[88%] text-graphite" />
          </div>
          <span className="font-display absolute inset-x-0 -bottom-8 text-center text-xs tracking-[0.45em] text-smoke" dir="ltr">
            SERAG · DAILY
          </span>
        </div>

        {/* Lid (on top so the box starts closed) */}
        <div className="box-lid absolute inset-x-0 bottom-0 flex h-[62%] flex-col items-center justify-center rounded-[15px] border border-mist-gray bg-[#f6f6f6] text-inkwell">
          <Monogram className="h-12 w-12 text-ember" />
          <span className="font-display mt-2 text-4xl font-light" dir="ltr">
            Serag
          </span>
          <span className="font-display mt-1 text-[0.7rem] tracking-[0.5em] text-smoke" dir="ltr">
            DAILY LASHES
          </span>
        </div>
      </div>

      {/* Price tag */}
      <div className="price-tag absolute -end-4 -bottom-[14%] flex flex-col items-center sm:-end-10" aria-hidden="true">
        <span className="h-12 w-px bg-graphite/30" />
        <span className="relative rounded-[10px] border border-graphite bg-white px-5 pt-5 pb-3 text-center">
          <span className="absolute top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-ember" />
          <span className="block text-xs text-smoke">{tag}</span>
          <span className="font-display block text-3xl leading-tight text-inkwell">
            {price}
          </span>
        </span>
      </div>
    </div>
  );
}
