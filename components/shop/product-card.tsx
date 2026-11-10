"use client";

import Image from "next/image";
import Link from "next/link";
import type { OfferInfo, Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, num, t } from "@/lib/i18n/format";
import { optimizable } from "@/lib/media";
import { offersFor } from "@/lib/pricing";
import { stockStatus } from "@/lib/stock";
import { trackAddToCart } from "@/lib/track";
import { cart } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { Heart, Plus, Star } from "../icons";
import { BoxVisual, LashPair } from "../lash-box";
import { useStore } from "./store-provider";
import { Glare } from "../fx";
import { toast } from "./toast";

/** Product photo, or the drawn lash box when there is no photo yet. */
export function ProductImage({ p, index = 0, sizes = "(min-width:1024px) 25vw, 50vw", priority = false }: { p: Product; index?: number; sizes?: string; priority?: boolean }) {
  if (p.imageUrl) {
    return (
      <span className="relative block aspect-[4/5] overflow-hidden rounded-none bg-pink-soft">
        <Image src={p.imageUrl} alt="" fill sizes={sizes} quality={85} priority={priority} unoptimized={!optimizable(p.imageUrl)} className="object-cover transition-transform duration-700 ease-[var(--ease-silk)] group-hover:scale-[1.04]" />
      </span>
    );
  }
  return <BoxVisual art={p.art} label={p.name.en || "Serag"} index={index} />;
}

const SWATCH: Record<Product["art"]["tone"], string> = { petal: "bg-pink-soft text-berry", rose: "bg-pink text-berry-deep", blush: "bg-blush text-cocoa", berry: "bg-ink text-white" };

/** Small square for lists (cart, add-ons): the photo, or a tinted tile with the lash drawing. */
export function ProductThumb({ p, className = "h-24 w-20 sm:h-28 sm:w-24" }: { p: Product; className?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl ${p.imageUrl ? "bg-pink-soft" : SWATCH[p.art.tone]} ${className}`}>
      {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="96px" unoptimized={!optimizable(p.imageUrl)} className="object-cover" /> : <LashPair style={p.art.style} map={p.art.map} className="w-[82%]" />}
    </span>
  );
}

export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-rose-ink ${className}`} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= Math.round(value)} className="h-3.5 w-3.5" />
      ))}
    </span>
  );
}

export function PriceTag({ p, large = false }: { p: Product; large?: boolean }) {
  const { lang, dict } = useI18n();
  const reduced = p.displayPrice < p.price;
  const ranged = p.variants.filter((v) => v.active && v.price !== null).some((v) => v.price !== p.price);
  const price = money(p.displayPrice, lang);
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-display ${large ? "text-4xl" : "text-2xl"} ${reduced ? "text-rose-ink" : "text-plum"}`}>{ranged ? t(dict.store.product.from, { price }) : price}</span>
      {reduced ? (
        <s className={`${large ? "text-lg" : "text-sm"} text-berry-deep/50`} aria-label={t(dict.store.product.was, { price: money(p.price, lang) })}>
          {money(p.price, lang)}
        </s>
      ) : null}
    </span>
  );
}

export function FavoriteButton({ p, className = "" }: { p: Product; className?: string }) {
  const { lang, dict } = useI18n();
  const { favorites, toggleFavorite, signedIn } = useStore();
  const on = favorites.includes(p.id);
  const name = localized(p.name, lang);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`${on ? dict.store.product.favRemove : dict.store.product.favAdd}: ${name}`}
      onClick={async () => {
        const nowOn = await toggleFavorite(p.id);
        if (nowOn && !signedIn) toast(dict.store.product.favLogin);
      }}
      className={`grid h-11 w-11 place-items-center rounded-full bg-surface/90 text-berry shadow-sm backdrop-blur transition-transform duration-200 active:scale-90 ${className}`}
    >
      <Heart filled={on} className="h-5 w-5" />
    </button>
  );
}

export function ProductCard({ p, offers, isNew = false, best = false, index = 0 }: { p: Product; offers: OfferInfo[]; isNew?: boolean; best?: boolean; index?: number }) {
  const { lang, dict } = useI18n();
  const s = dict.store;
  const name = localized(p.name, lang);
  const status = stockStatus(p);
  const link = href(lang, `/p/${p.slug}`);
  const pct = p.displayPrice < p.price ? Math.round((1 - p.displayPrice / p.price) * 100) : 0;
  const qtyOffer = offersFor({ productId: p.id, categoryId: p.categoryId }, offers).find((o) => o.minQty > 1);
  const hasOptions = p.variants.some((v) => v.active);

  const badges = [
    pct > 0 ? { text: `−${num(pct, lang)}${lang === "ar" ? "٪" : "%"}`, tone: "bg-rose-ink text-ivory" } : null,
    status === "out" ? { text: s.badges.out, tone: "bg-ink-2 text-ivory" } : status === "low" ? { text: s.badges.low, tone: "bg-surface text-graphite border border-graphite" } : null,
    isNew ? { text: s.badges.new, tone: "bg-ember text-white" } : null,
    best ? { text: s.badges.best, tone: "bg-ember text-white" } : null,
  ].filter((b): b is { text: string; tone: string } => b !== null);

  return (
    <article className="box-card group relative flex h-full flex-col rounded-none border-[1.5px] border-apricot bg-surface p-4 sm:p-5">
      <div className="relative">
        <Link href={link} aria-label={name} className="block rounded-none focus-visible:outline-offset-4">
          <Glare>
            <ProductImage p={p} index={index} />
          </Glare>
        </Link>
        {badges.length ? (
          <ul className="pointer-events-none absolute top-3 start-3 flex flex-col items-start gap-1.5">
            {badges.slice(0, 2).map((b) => (
              <li key={b.text} className={`rounded-full px-2.5 py-1 text-[0.72rem] font-medium ${b.tone}`}>
                {b.text}
              </li>
            ))}
          </ul>
        ) : null}
        <FavoriteButton p={p} className="absolute top-3 end-3" />
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="text-base font-medium text-inkwell">
          <Link href={link} className="hover:text-ember">
            {name}
          </Link>
        </h3>
        {p.rating ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-berry-deep/70">
            <Stars value={p.rating.avg} />
            <span>{t(s.product.reviewsCount, { count: num(p.rating.count, lang) })}</span>
          </p>
        ) : null}
        {qtyOffer ? <p className="mt-1 text-xs font-semibold text-rose-ink">{localized(qtyOffer.name, lang)}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <PriceTag p={p} />
          {status === "out" ? (
            <Link href={link} className="text-xs font-semibold text-berry underline-offset-4 hover:underline">
              {s.product.notifySubmit}
            </Link>
          ) : hasOptions || p.kind === "gift_card" ? (
            <Link href={link} aria-label={`${t(s.product.choose, { label: localized(p.optionsLabel, lang) || s.product.optionLabel })}: ${name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-berry/30 text-berry transition-colors hover:bg-berry hover:text-white">
              <Plus className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                cart.add(p.id);
                trackAddToCart({ id: p.id, name: p.name.en || name, price: p.displayPrice });
                toast(t(s.product.added, { name }));
              }}
              aria-label={`${s.product.add}: ${name}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ember text-white transition-[transform,background-color] duration-200 hover:bg-tangerine active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
