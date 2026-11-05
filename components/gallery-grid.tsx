"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import type { LashStyle } from "@/lib/lash";
import { arDigits, gallery, styleLabel, type GalleryItem } from "@/lib/site";
import { LashEye } from "./art";

const tones: Record<GalleryItem["tone"], { bg: string; fg: string; text: string; sub: string }> = {
  ink: { bg: "bg-ink", fg: "text-gold-soft", text: "text-ivory", sub: "text-ivory/65" },
  cream: { bg: "bg-ivory", fg: "text-cocoa", text: "text-cocoa", sub: "text-taupe" },
  blush: { bg: "bg-blush", fg: "text-rosewood", text: "text-cocoa", sub: "text-taupe" },
  sand: { bg: "bg-sand", fg: "text-gold-deep", text: "text-cocoa", sub: "text-taupe" },
};

const filters: ("all" | LashStyle)[] = ["all", "classic", "hybrid", "volume", "mega", "wet", "lift"];

export function GalleryGrid() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const items = filter === "all" ? gallery : gallery.filter((g) => g.style === filter);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="تصفية المعرض حسب النمط">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className="min-h-11 rounded-full border border-cocoa/15 px-5 text-sm text-cocoa transition-colors duration-200 hover:border-cocoa/50 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-ivory"
          >
            {f === "all" ? "الكل" : styleLabel[f]}
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        {arDigits(items.length)} أعمال معروضة
      </p>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const t = tones[item.tone];
          return (
            <li
              key={`${filter}-${item.id}`}
              className="fade-in group"
              style={{ "--d": `${i * 70}ms` } as CSSProperties}
            >
              <figure
                className={`relative overflow-hidden rounded-[1.75rem] ${t.bg} ${i % 3 === 1 ? "lg:translate-y-10" : ""} transition-transform duration-500 ease-[var(--ease-silk)] hover:-translate-y-1`}
              >
                <div className="relative aspect-[4/5]">
                  {item.image ? (
                    <Image src={item.image} alt={`${item.title} — ${item.caption}`} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
                  ) : (
                    <div className={`absolute inset-0 grid place-items-center px-8 ${t.fg}`}>
                      <div className="arch absolute inset-x-10 top-10 bottom-24 border border-current opacity-20" aria-hidden="true" />
                      <LashEye
                        style={item.style}
                        map={item.map}
                        seed={i + 2}
                        className="relative w-full transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-[1.04]"
                        label={`رسم توضيحي: ${item.title}`}
                      />
                    </div>
                  )}
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6">
                  <span>
                    <span className={`block text-lg ${t.text}`}>{item.title}</span>
                    <span className={`block text-sm ${t.sub}`}>{item.caption}</span>
                  </span>
                  <span className={`eyebrow shrink-0 ${t.sub}`} dir="ltr">
                    {item.style.toUpperCase()}
                  </span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
