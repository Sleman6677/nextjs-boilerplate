"use client";

import Link from "next/link";
import type { OfferInfo, Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { useI18n } from "../i18n-provider";
import { ProductCard } from "../shop/product-card";
import { useStore } from "../shop/store-provider";

/** Favorites from this device and the account (kept in sync by the store provider). */
export function FavoritesList({ products, offers }: { products: Product[]; offers: OfferInfo[] }) {
  const { lang, dict } = useI18n();
  const { favorites } = useStore();
  const byId = new Map(products.map((p) => [p.id, p]));
  const shown = favorites.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
  if (shown.length === 0) {
    return (
      <div className="rounded-[2rem] border border-cocoa/10 bg-ivory p-10 text-center">
        <p className="text-taupe">{dict.store.account.favoritesEmpty}</p>
        <Link href={href(lang, "/shop")} className="btn btn-ink mt-6">
          {dict.store.home.cta}
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {shown.map((p, i) => (
        <li key={p.id}>
          <ProductCard p={p} offers={offers} index={i} />
        </li>
      ))}
    </ul>
  );
}
