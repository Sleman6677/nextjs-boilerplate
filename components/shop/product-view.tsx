"use client";

import { SplitTitle } from "@/components/split-title";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { requestStockAlert } from "@/app/actions/account";
import type { OfferInfo, Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, num, t } from "@/lib/i18n/format";
import { optimizable } from "@/lib/media";
import { displayPrice, offersFor, round2 } from "@/lib/pricing";
import { maxQty, stockStatus } from "@/lib/stock";
import { trackAddToCart, trackViewItem } from "@/lib/track";
import { cart } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { Check, Minus, Plus } from "../icons";
import { BoxVisual } from "../lash-box";
import { FavoriteButton, ProductThumb, Stars } from "./product-card";
import { toast } from "./toast";

function Gallery({ p }: { p: Product }) {
  const { lang, dict } = useI18n();
  const [active, setActive] = useState(0);
  if (p.images.length === 0) return <BoxVisual art={p.art} label={p.name.en || "Serag"} />;
  return (
    <div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-none [scrollbar-width:none] lg:overflow-hidden" onScroll={(e) => setActive(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}>
        {p.images.map((src, i) => (
          <div key={src} className={`relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden rounded-none bg-pink-soft ${i === active ? "" : "lg:hidden"}`}>
            <Image src={src} alt={t(dict.store.product.photo, { n: num(i + 1, lang), total: num(p.images.length, lang) })} fill priority={i === 0} sizes="(min-width:1024px) 45vw, 100vw" quality={85} unoptimized={!optimizable(src)} className="object-cover" />
          </div>
        ))}
      </div>
      {p.images.length > 1 ? (
        <div className="mt-3 flex gap-2" role="group" aria-label={localized(p.name, lang)}>
          {p.images.map((src, i) => (
            <button key={src} type="button" onClick={() => setActive(i)} aria-pressed={i === active} aria-label={t(dict.store.product.photo, { n: num(i + 1, lang), total: num(p.images.length, lang) })} className="relative h-16 w-14 overflow-hidden rounded-xl border-2 border-transparent aria-pressed:border-berry">
              <Image src={src} alt="" fill sizes="56px" unoptimized={!optimizable(src)} className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotifyForm({ p, variantId }: { p: Product; variantId: string | null }) {
  const { lang, dict } = useI18n();
  const s = dict.store.product;
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const r = await requestStockAlert({ productId: p.id, variantId, phone: String(new FormData(e.currentTarget).get("phone") ?? ""), lang });
    setBusy(false);
    if (r.ok) setDone(true);
    else setError(true);
  }
  if (done) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-pink-soft/70 p-4 text-sm text-berry-deep">
        <Check className="h-5 w-5 text-berry" /> {s.notifyDone}
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="rounded-none border border-berry/15 bg-surface p-5">
      <p className="font-semibold text-plum">{s.notifyTitle}</p>
      <p className="mt-1 text-sm text-berry-deep/75">{s.notifyText}</p>
      <div className="mt-4 flex gap-2">
        <label htmlFor="notify-phone" className="sr-only">
          {s.notifyPhone}
        </label>
        <input id="notify-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required placeholder="05X-XXX-XXXX" aria-invalid={error} aria-describedby={error ? "notify-err" : undefined} className="min-h-12 w-full rounded-full border border-berry/20 bg-white px-5 text-base text-plum focus:border-berry focus:outline-none rtl:text-right" />
        <button type="submit" disabled={busy} className="btn btn-berry min-h-12 shrink-0 px-6 text-sm disabled:opacity-60">
          {s.notifySubmit}
        </button>
      </div>
      {error ? (
        <p id="notify-err" role="alert" className="mt-2 text-sm text-rose-ink">
          {dict.store.login.errors.phone}
        </p>
      ) : null}
    </form>
  );
}

export function ProductView({ p, offers, addons, gift }: { p: Product; offers: OfferInfo[]; addons: { product: Product; specialPrice: number }[]; gift: { bonusPct: number; validMonths: number | null } | null }) {
  const { lang, dict } = useI18n();
  const s = dict.store.product;
  const options = p.variants.filter((v) => v.active);
  const [variantId, setVariantId] = useState<string | null>(options.length === 1 ? options[0].id : null);
  const [qty, setQty] = useState(1);
  const variant = options.find((v) => v.id === variantId) ?? null;
  const name = localized(p.name, lang);
  const label = localized(p.optionsLabel, lang) || s.optionLabel;

  const listPrice = variant?.price ?? (options.length ? Math.min(...options.map((v) => v.price ?? p.price)) : p.price);
  const shown = displayPrice({ productId: p.id, categoryId: p.categoryId, listPrice, salePrice: p.salePrice, giftCard: p.kind === "gift_card" }, offers);
  const status = stockStatus(p, variantId);
  const limit = maxQty(p, variantId);
  const needsChoice = options.length > 0 && !variant;
  const qtyOffers = offersFor({ productId: p.id, categoryId: p.categoryId }, offers).filter((o) => o.minQty > 1);
  const remaining = variant ? variant.stock : p.stock;

  useEffect(() => {
    trackViewItem({ id: p.id, name: p.name.en || p.name.ar, price: p.displayPrice });
  }, [p.id, p.name.en, p.name.ar, p.displayPrice]);

  function add() {
    if (needsChoice || status === "out") return;
    cart.add(p.id, variantId, Math.min(qty, limit));
    trackAddToCart({ id: p.id, name: p.name.en || p.name.ar, price: shown.price, quantity: Math.min(qty, limit), variant: variant?.name.en || variant?.name.ar });
    toast(t(s.added, { name: variant ? `${name} · ${localized(variant.name, lang)}` : name }));
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div className="relative">
        <Gallery p={p} />
        <FavoriteButton p={p} className="absolute top-4 end-4" />
      </div>

      <div>
        <SplitTitle as="h1" className="font-display text-4xl leading-tight text-plum sm:text-5xl" text={name} />
        {p.rating ? (
          <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-berry-deep/80">
            <Stars value={p.rating.avg} />
            {t(s.rating, { avg: num(p.rating.avg, lang) })} {t(s.reviewsCount, { count: num(p.rating.count, lang) })}
          </a>
        ) : null}

        <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className={`font-display text-5xl ${shown.price < listPrice ? "text-rose-ink" : "text-plum"}`}>{money(shown.price, lang)}</span>
          {shown.price < listPrice ? (
            <>
              <s className="text-xl text-berry-deep/50">{money(listPrice, lang)}</s>
              <span className="rounded-full bg-rose-ink px-3 py-1 text-xs font-semibold text-ivory">{t(s.save, { amount: money(round2(listPrice - shown.price), lang) })}</span>
            </>
          ) : null}
        </div>
        {shown.offer ? <p className="mt-2 text-sm font-semibold text-rose-ink">{localized(offers.find((o) => o.id === shown.offer!.id)!.name, lang)}</p> : null}
        {qtyOffers.map((o) => (
          <p key={o.id} className="mt-2 inline-flex rounded-full bg-pink-soft px-3 py-1 text-sm font-semibold text-berry">
            {s.quantityOffer}: {localized(o.name, lang)}
          </p>
        ))}

        {p.kind === "gift_card" && gift ? (
          <div className="mt-6 rounded-none bg-ink-2 p-5 text-ivory">
            <p className="font-display text-3xl text-gold-soft">{t(s.giftValue, { value: money(round2(listPrice * (1 + gift.bonusPct / 100)), lang) })}</p>
            <p className="mt-2 text-sm leading-7 text-ivory/80">{s.giftHow}</p>
            {gift.validMonths ? <p className="mt-2 text-xs text-gold-soft/80">{t(s.giftValid, { months: num(gift.validMonths, lang) })}</p> : null}
          </div>
        ) : null}

        <p className="mt-6 text-lg leading-9 whitespace-pre-line text-berry-deep/85">{localized(p.description, lang)}</p>

        {options.length > 0 ? (
          <fieldset className="mt-8">
            <legend className="text-sm font-semibold text-plum">{t(s.choose, { label })}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {options.map((v) => {
                const out = stockStatus(p, v.id) === "out";
                return (
                  <label key={v.id} className={`relative flex min-h-12 cursor-pointer items-center rounded-full border px-5 text-sm transition-colors has-checked:border-berry has-checked:bg-berry has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-berry ${out ? "border-dashed border-berry/25 text-berry-deep/45" : "border-berry/25 text-plum hover:border-berry"}`}>
                    <input type="radio" name="variant" value={v.id} checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="sr-only" />
                    {localized(v.name, lang)}
                    {out ? <span className="sr-only"> · {dict.store.stock.out}</span> : null}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <p className={`mt-6 text-sm font-semibold ${status === "out" ? "text-rose-ink" : status === "low" ? "text-berry" : "text-emerald-700"}`} aria-live="polite">
          {needsChoice ? "" : status === "out" ? dict.store.stock.out : status === "low" && remaining !== null ? t(dict.store.stock.lowN, { n: num(remaining, lang) }) : p.kind === "gift_card" ? "" : dict.store.stock.in}
        </p>

        {status === "out" && !needsChoice ? (
          <div className="mt-4">
            <NotifyForm p={p} variantId={variantId} />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-berry/25 bg-surface p-1" role="group" aria-label={s.qty}>
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={s.dec} className="grid h-11 w-11 place-items-center rounded-full text-berry hover:bg-pink-soft">
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-8 text-center font-semibold text-plum tabular-nums" aria-live="polite">
                {num(qty, lang)}
              </span>
              <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, limit), q + 1))} aria-label={s.inc} className="grid h-11 w-11 place-items-center rounded-full bg-ember text-white">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button type="button" onClick={add} disabled={needsChoice} className="btn btn-berry min-h-14 flex-1 px-8 disabled:opacity-50">
              {needsChoice ? t(s.choose, { label }) : s.add}
            </button>
          </div>
        )}

        {addons.length > 0 ? (
          <section className="mt-10 rounded-none border border-berry/15 bg-pink-soft/40 p-5" aria-labelledby="addons-title">
            <h2 id="addons-title" className="font-semibold text-plum">
              {s.addons}
            </h2>
            <ul className="mt-4 space-y-3">
              {addons.map(({ product: a, specialPrice }) => {
                const aname = localized(a.name, lang);
                const choose = a.variants.some((v) => v.active);
                return (
                  <li key={a.id} className="flex items-center gap-4">
                    <Link href={href(lang, `/p/${a.slug}`)} tabIndex={-1} aria-hidden="true">
                      <ProductThumb p={a} className="h-16 w-14" />
                    </Link>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-plum">{aname}</span>
                      <span className="text-sm text-rose-ink">{t(s.addonPrice, { price: money(specialPrice, lang), was: money(a.price, lang) })}</span>
                    </span>
                    {choose ? (
                      <Link href={href(lang, `/p/${a.slug}`)} className="btn btn-ghost-dark min-h-11 shrink-0 px-4 text-sm">
                        {s.addonAdd}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          cart.add(a.id);
                          toast(t(s.added, { name: aname }));
                        }}
                        className="btn btn-berry min-h-11 shrink-0 px-4 text-sm"
                      >
                        {s.addonAdd}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
