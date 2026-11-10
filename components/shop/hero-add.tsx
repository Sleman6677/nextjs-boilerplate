"use client";

import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, t } from "@/lib/i18n/format";
import { stockStatus } from "@/lib/stock";
import { trackAddToCart } from "@/lib/track";
import { cart } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { toast } from "./toast";

/** The hero's working action: add the hero lash to the bag, or choose its option first. */
export function HeroAdd({ p }: { p: Product }) {
  const { lang, dict } = useI18n();
  const s = dict.store.product;
  const name = localized(p.name, lang);
  const hasOptions = p.variants.some((v) => v.active);
  if (stockStatus(p) === "out") return <span className="btn btn-ghost-dark pointer-events-none opacity-60">{dict.store.stock.out}</span>;
  if (hasOptions)
    return (
      <Link href={href(lang, `/p/${p.slug}`)} className="btn btn-gold">
        {t(s.choose, { label: localized(p.optionsLabel, lang) || s.optionLabel })}
      </Link>
    );
  return (
    <button
      type="button"
      className="btn btn-gold"
      onClick={() => {
        cart.add(p.id);
        trackAddToCart({ id: p.id, name: p.name.en || name, price: p.displayPrice });
        toast(t(s.added, { name }));
      }}
    >
      {s.add}
    </button>
  );
}
