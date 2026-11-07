"use client";

import { SplitTitle } from "@/components/split-title";
import { useState } from "react";
import type { Category, OfferInfo } from "@/lib/catalog";
import { localized } from "@/lib/i18n/format";
import { useI18n } from "../i18n-provider";
import { Reveal } from "../reveal";
import { ProductCard } from "./product-card";

/** All products with one chip per group (the store has only a few groups, so no search). */
export function CatalogGrid({ categories, offers, newIds, bestIds, initial = "all" }: { categories: Category[]; offers: OfferInfo[]; newIds: string[]; bestIds: string[]; initial?: string }) {
  const { lang, dict } = useI18n();
  const [filter, setFilter] = useState(categories.some((c) => c.slug === initial) ? initial : "all");
  const shown = filter === "all" ? categories : categories.filter((c) => c.slug === filter);

  return (
    <>
      {categories.length > 1 ? (
        <div className="-mx-5 mb-12 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2 sm:mx-auto" role="group" aria-label={dict.store.nav.categories}>
            {[{ slug: "all", label: dict.gallery.all }, ...categories.map((c) => ({ slug: c.slug, label: localized(c.name, lang) }))].map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setFilter(c.slug)}
                aria-pressed={filter === c.slug}
                className="min-h-11 rounded-full border border-berry/20 px-5 text-sm whitespace-nowrap text-plum transition-colors duration-200 hover:border-berry/60 aria-pressed:border-berry aria-pressed:bg-berry aria-pressed:text-ivory"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-20">
        {shown.map((c) => (
          <section key={c.id} id={c.slug} aria-labelledby={`cat-${c.slug}`} className="scroll-mt-28">
            {categories.length > 1 ? (
              <header className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-berry/15 pb-4">
                <SplitTitle id={`cat-${c.slug}`} className="font-display text-3xl text-plum sm:text-4xl" text={localized(c.name, lang)} />
                {localized(c.description, lang) ? <p className="text-sm text-berry-deep/70">{localized(c.description, lang)}</p> : null}
              </header>
            ) : null}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
              {c.products.map((p, i) => (
                <Reveal as="li" key={`${filter}-${p.id}`} delay={(i % 4) * 80}>
                  <ProductCard p={p} offers={offers} index={i} isNew={newIds.includes(p.id)} best={bestIds.includes(p.id)} />
                </Reveal>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
