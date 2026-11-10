import Image from "next/image";
import type { CSSProperties } from "react";
import type { LashMap, LashStyle } from "@/lib/lash";
import type { LashBox } from "@/lib/site";
import { LashEye } from "./art";
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
  petal: { box: "bg-stone-2", tray: "bg-stone", lashes: "text-kohl", lid: "bg-kohl text-stone", label: "text-kohl" },
  rose: { box: "bg-[#e7e7e3]", tray: "bg-stone", lashes: "text-kohl", lid: "bg-copper text-white", label: "text-kohl" },
  blush: { box: "bg-[#d9d9d4]", tray: "bg-stone", lashes: "text-kohl", lid: "bg-stone text-kohl ring-1 ring-inset ring-kohl", label: "text-kohl" },
  berry: { box: "bg-kohl", tray: "bg-kohl-2", lashes: "text-stone", lid: "bg-copper text-white", label: "text-stone/80" },
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
    <div className={`relative aspect-[4/5] overflow-hidden rounded-[12px] ${t.box}`}>
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

      <div className={`absolute inset-x-6 top-[32%] bottom-[17%] grid place-items-center rounded-[8px] ${t.tray}`}>
        {imageUrl ? (
          <span className="card-lashes absolute inset-2 overflow-hidden rounded-[6px]">
            <Image src={imageUrl} alt="" fill unoptimized sizes="(min-width:1024px) 30vw, 90vw" className="object-cover" />
          </span>
        ) : (
          <LashPair style={art.style} map={art.map} seed={index + 3} className={`card-lashes w-[86%] ${t.lashes}`} />
        )}
      </div>

      <div className={`card-lid absolute inset-x-4 top-4 flex h-[23%] flex-col items-center justify-center rounded-[8px] ${t.lid}`}>
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
