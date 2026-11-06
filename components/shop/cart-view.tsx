"use client";

import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, num, t } from "@/lib/i18n/format";
import { shop } from "@/lib/site";
import { cart, useCart } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { ArrowForward, Close, Minus, Plus } from "../icons";
import { BoxVisual } from "../lash-box";

export function CartView({ products, accounts, freeShippingThreshold }: { products: Product[]; accounts: boolean; freeShippingThreshold: number | null }) {
  const { lang, dict } = useI18n();
  const c = dict.cart;
  const items = useCart();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = items.filter((i) => byId.has(i.id)).map((i) => ({ product: byId.get(i.id)!, qty: i.qty }));
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const fmt = (n: number) => money(n, lang, shop.currency);
  const left = freeShippingThreshold !== null ? Math.max(0, freeShippingThreshold - subtotal) : null;

  if (lines.length === 0) {
    return (
      <div className="rounded-[2rem] border border-berry/10 bg-ivory p-10 text-center">
        <p className="text-lg text-plum">{c.empty}</p>
        <Link href={href(lang, "/shop")} className="btn btn-berry mt-6">
          {c.continue}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <ul className="space-y-4">
        {lines.map(({ product: p, qty }, i) => {
          const name = localized(p.name, lang);
          return (
            <li key={p.id} className="flex items-center gap-4 rounded-[1.5rem] border border-berry/10 bg-ivory p-3 sm:gap-6 sm:p-4">
              <div className="w-24 shrink-0 sm:w-28">
                <BoxVisual art={p.art} label={p.name.en || "Serag"} imageUrl={p.imageUrl} index={i} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-naskh truncate text-xl text-plum">{name}</p>
                <p className="mt-1 text-sm text-berry-deep/70">{fmt(p.price)}</p>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-berry/20 p-1">
                  <button type="button" onClick={() => cart.set(p.id, qty - 1)} aria-label={t(dict.shop.dec, { name })} className="grid h-9 w-9 place-items-center rounded-full text-berry hover:bg-pink-soft">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-7 text-center font-semibold tabular-nums text-plum">{num(qty, lang)}</span>
                  <button type="button" onClick={() => cart.add(p.id)} aria-label={t(dict.shop.inc, { name })} className="grid h-9 w-9 place-items-center rounded-full bg-berry text-ivory">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <button type="button" onClick={() => cart.remove(p.id)} aria-label={t(c.remove, { name })} className="grid h-10 w-10 place-items-center rounded-full text-berry-deep/60 hover:bg-pink-soft hover:text-berry">
                  <Close className="h-4 w-4" />
                </button>
                <span className="font-display text-xl text-plum">{fmt(p.price * qty)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-[2rem] bg-plum p-7 text-ivory lg:sticky lg:top-32">
        <p className="flex items-center justify-between text-lg">
          <span>{c.subtotal}</span>
          <span className="font-display text-3xl">{fmt(subtotal)}</span>
        </p>
        {left !== null && left > 0 ? (
          <div className="mt-5">
            <p className="text-sm text-pink-soft">{t(c.freeLeft, { amount: fmt(left) })}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ivory/15" aria-hidden="true">
              <div className="h-full rounded-full bg-pink" style={{ width: `${Math.min(100, (subtotal / (freeShippingThreshold || 1)) * 100)}%` }} />
            </div>
          </div>
        ) : null}
        <Link href={href(lang, accounts ? "/checkout" : "/shop#collection")} className="btn btn-pink group mt-7 w-full">
          {c.checkout}
          <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
        </Link>
        <Link href={href(lang, "/shop")} className="mt-4 block text-center text-sm text-pink-soft underline-offset-4 hover:underline">
          {c.continue}
        </Link>
      </aside>
    </div>
  );
}
