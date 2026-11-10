"use client";

import Link from "next/link";
import { useState } from "react";
import type { Addon, Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, num, points as pointsLabel, t } from "@/lib/i18n/format";
import type { Zone } from "@/lib/orders";
import { maxQty } from "@/lib/stock";
import { cart, cartExtras, lineKey, useCart, useCartExtras } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { ArrowForward, Close, Minus, Plus } from "../icons";
import { OrderSummary } from "./order-summary";
import { ProductThumb } from "./product-card";
import { useStore } from "./store-provider";
import { toast } from "./toast";
import { useQuote } from "./use-quote";

export const inputClass = "min-h-12 w-full rounded-full border border-berry/20 bg-black/60 px-5 text-base text-plum placeholder:text-berry-deep/40 focus:border-berry focus:outline-none";

/** Coupon / gift card field with apply & remove. */
export function CodeField({ id, label, placeholder, value, onApply, ok, error }: { id: string; label: string; placeholder: string; value: string; onApply: (v: string) => void; ok?: string | null; error?: string | null }) {
  const { dict } = useI18n();
  const [draft, setDraft] = useState(value);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-plum">
        {label}
      </label>
      <div className="mt-2 flex gap-2">
        <input id={id} value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} placeholder={placeholder} dir="ltr" autoCapitalize="characters" autoComplete="off" spellCheck={false} className={`${inputClass} font-semibold tracking-wider rtl:text-right`} aria-invalid={!!error} aria-describedby={`${id}-msg`} />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onApply("");
            }}
            className="btn btn-ghost-dark min-h-12 shrink-0 px-5 text-sm"
          >
            {dict.store.cart.remove2}
          </button>
        ) : (
          <button type="button" onClick={() => onApply(draft.trim())} disabled={!draft.trim()} className="btn btn-berry min-h-12 shrink-0 px-5 text-sm disabled:opacity-50">
            {dict.store.cart.apply}
          </button>
        )}
      </div>
      <p id={`${id}-msg`} role={error ? "alert" : "status"} className={`mt-1.5 min-h-5 text-xs ${error ? "text-rose-ink" : "text-emerald-700"}`}>
        {error ?? ok ?? ""}
      </p>
    </div>
  );
}

export function CartView({ products, zones, addons }: { products: Product[]; zones: Zone[]; addons: Record<string, Addon[]> }) {
  const { lang, dict } = useI18n();
  const c = dict.store.cart;
  const ck = dict.store.checkout;
  const items = useCart();
  const extras = useCartExtras();
  const { signedIn } = useStore();
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = items.filter((i) => byId.has(i.id));
  const { quote, error, busy } = useQuote({ cart: lines.map((l) => ({ id: l.id, variantId: l.variantId, qty: l.qty })), couponCode: extras.couponCode, giftCardCode: extras.giftCardCode, usePoints: extras.usePoints, zoneId: extras.zoneId || null }, lines.length > 0);
  const priced = new Map((quote?.lines ?? []).map((l) => [l.key, l]));
  const inCart = new Set(lines.map((l) => l.id));
  const suggestions = [...new Map(lines.flatMap((l) => addons[l.id] ?? []).filter((a) => !inCart.has(a.product.id)).map((a) => [a.product.id, a])).values()].slice(0, 3);
  const fmt = (n: number) => money(n, lang);

  if (lines.length === 0) {
    return (
      <div className="rounded-[2rem] border border-berry/10 bg-surface p-10 text-center">
        <p className="text-lg text-plum">{c.empty}</p>
        <Link href={href(lang, "/shop")} className="btn btn-berry mt-6">
          {c.continue}
        </Link>
      </div>
    );
  }

  const stockError = error && (error.code === "out_of_stock" || error.code === "product_unavailable" || error.code === "option_required");

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {stockError ? (
          <p role="alert" className="rounded-2xl bg-rose-ink/10 p-4 text-sm text-rose-ink">
            {t(ck.errors[error.code as keyof typeof ck.errors] ?? ck.errors.generic, { name: error.detail ?? "" })}
          </p>
        ) : null}
        <ul className="space-y-4">
          {lines.map((line) => {
            const p = byId.get(line.id)!;
            const key = lineKey(line);
            const variant = p.variants.find((v) => v.id === line.variantId);
            const name = localized(p.name, lang);
            const pl = priced.get(key);
            const limit = maxQty(p, line.variantId);
            return (
              <li key={key} className="flex items-center gap-4 rounded-[1.5rem] border border-berry/10 bg-surface p-3 sm:gap-5 sm:p-4">
                <Link href={href(lang, `/p/${p.slug}`)} tabIndex={-1} aria-hidden="true">
                  <ProductThumb p={p} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={href(lang, `/p/${p.slug}`)} className="font-semibold text-plum hover:text-berry">
                    {name}
                  </Link>
                  {variant ? <p className="text-sm text-berry-deep/70">{localized(variant.name, lang)}</p> : null}
                  {pl?.offerLabel || (pl && pl.addonUnits > 0) ? <p className="text-xs font-semibold text-rose-ink">{pl.addonUnits > 0 ? c.special : pl.offerLabel}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-berry/20 p-0.5" role="group" aria-label={`${dict.store.product.qty}: ${name}`}>
                      <button type="button" onClick={() => cart.set(key, line.qty - 1)} aria-label={dict.store.product.dec} className="grid h-10 w-10 place-items-center rounded-full text-berry hover:bg-pink-soft">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-7 text-center font-semibold text-plum tabular-nums">{num(line.qty, lang)}</span>
                      <button type="button" onClick={() => cart.set(key, Math.min(limit, line.qty + 1))} disabled={line.qty >= limit} aria-label={dict.store.product.inc} className="grid h-10 w-10 place-items-center rounded-full bg-ember text-ink disabled:opacity-40">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 self-stretch">
                  <button type="button" onClick={() => cart.remove(key)} aria-label={t(c.remove, { name })} className="grid h-10 w-10 place-items-center rounded-full text-berry-deep/60 hover:bg-pink-soft hover:text-berry">
                    <Close className="h-4 w-4" />
                  </button>
                  <span className="mt-auto text-end">
                    {pl && pl.onSale ? (
                      <s className="block text-xs text-berry-deep/45">{fmt(pl.listPrice * line.qty)}</s>
                    ) : null}
                    <span className="font-display text-xl text-plum">{pl ? fmt(pl.lineTotal) : fmt(p.displayPrice * line.qty)}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {suggestions.length > 0 ? (
          <section className="rounded-[1.8rem] border border-dashed border-berry/25 bg-pink-soft/30 p-5" aria-labelledby="cart-addons">
            <h2 id="cart-addons" className="font-semibold text-plum">
              {c.addons}
            </h2>
            <ul className="mt-4 space-y-3">
              {suggestions.map(({ product: a, specialPrice }) => {
                const aname = localized(a.name, lang);
                const choose = a.variants.some((v) => v.active);
                return (
                  <li key={a.id} className="flex items-center gap-4">
                    <ProductThumb p={a} className="h-16 w-14" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-plum">{aname}</span>
                      <span className="text-sm text-rose-ink">{t(dict.store.product.addonPrice, { price: fmt(specialPrice), was: fmt(a.price) })}</span>
                    </span>
                    {choose ? (
                      <Link href={href(lang, `/p/${a.slug}`)} className="btn btn-ghost-dark min-h-11 shrink-0 px-4 text-sm">
                        {dict.store.product.addonAdd}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          cart.add(a.id);
                          toast(t(dict.store.product.added, { name: aname }));
                        }}
                        className="btn btn-berry min-h-11 shrink-0 px-4 text-sm"
                      >
                        {dict.store.product.addonAdd}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-5 rounded-[1.8rem] border border-berry/10 bg-surface p-5 sm:grid-cols-2 sm:p-6">
          <CodeField
            id="cart-coupon"
            label={c.coupon}
            placeholder={c.couponPh}
            value={extras.couponCode}
            onApply={(v) => cartExtras.set({ couponCode: v })}
            ok={quote?.discountKind === "coupon" ? t(c.couponOk, { code: quote.discountCode ?? "" }) : null}
            error={extras.couponCode && quote?.couponError ? (ck.couponErrors[quote.couponError as keyof typeof ck.couponErrors] ?? ck.couponErrors.coupon_not_found) : null}
          />
          <CodeField
            id="cart-gift"
            label={c.giftCard}
            placeholder={c.giftCardPh}
            value={extras.giftCardCode}
            onApply={(v) => cartExtras.set({ giftCardCode: v })}
            ok={quote && extras.giftCardCode && !quote.giftCardError ? t(c.giftOk, { balance: fmt(quote.giftCardBalance) }) : null}
            error={extras.giftCardCode && quote?.giftCardError ? (ck.giftErrors[quote.giftCardError as keyof typeof ck.giftErrors] ?? ck.giftErrors.gift_not_found) : null}
          />
          <p className="text-xs leading-6 text-berry-deep/70 sm:col-span-2">{c.oneDiscount}</p>

          <div className="sm:col-span-2">
            <p className="text-sm font-semibold text-plum">{c.points}</p>
            {signedIn && quote && quote.pointsBalance > 0 ? (
              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-plum">
                <input type="checkbox" checked={extras.usePoints} onChange={(e) => cartExtras.set({ usePoints: e.target.checked })} className="h-5 w-5 accent-berry" />
                {t(c.usePoints, { points: pointsLabel(quote.pointsAvailable, lang), value: fmt(quote.pointsAvailable * quote.pointValue) })}
              </label>
            ) : signedIn ? (
              <p className="mt-1 text-sm text-berry-deep/70">{t(c.noPoints, { points: pointsLabel(quote?.pointsEarned ?? 0, lang) })}</p>
            ) : (
              <Link href={href(lang, `/login?next=/${lang}/cart`)} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-berry underline-offset-4 hover:underline">
                {c.pointsLogin}
              </Link>
            )}
          </div>

          <div>
            <label htmlFor="cart-zone" className="text-sm font-semibold text-plum">
              {c.zone}
            </label>
            <select id="cart-zone" value={extras.zoneId} onChange={(e) => cartExtras.set({ zoneId: e.target.value })} className={`${inputClass} mt-2`}>
              <option value="">{c.zoneChoose}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {localized(z.name, lang)} · {z.price === 0 ? c.free : fmt(z.price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cart-note" className="text-sm font-semibold text-plum">
              {c.note}
            </label>
            <textarea id="cart-note" value={extras.note} onChange={(e) => cartExtras.set({ note: e.target.value.slice(0, 500) })} placeholder={c.notePh} rows={2} className="mt-2 w-full rounded-2xl border border-berry/20 bg-black/60 px-5 py-3 text-base text-plum focus:border-berry focus:outline-none" />
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-[2rem] bg-ink-2 p-6 text-ivory lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">{dict.pay.summary}</h2>
        <div className="mt-5">
          <OrderSummary quote={quote} busy={busy} />
        </div>
        <Link href={href(lang, "/checkout")} aria-disabled={!!stockError} className={`btn btn-pink group mt-6 w-full ${stockError ? "pointer-events-none opacity-50" : ""}`}>
          {c.checkout}
          <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
        </Link>
        <Link href={href(lang, "/shop")} className="mt-3 block min-h-11 content-center text-center text-sm text-gold-soft/80 hover:text-ivory">
          {c.continue}
        </Link>
      </aside>
    </div>
  );
}
