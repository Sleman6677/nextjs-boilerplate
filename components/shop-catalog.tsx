"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { boxes, localized, money, num, t } from "@/lib/i18n/format";
import { lashBoxes, shop } from "@/lib/site";
import { cart, useCart } from "./cart-store";
import { Checkout } from "./checkout";
import { useI18n } from "./i18n-provider";
import { ArrowForward, Bag, Minus, Plus } from "./icons";
import { BoxVisual, HeroBox } from "./lash-box";
import { Reveal } from "./reveal";

export function ShopCatalog({ categories, accounts = false, onlinePayments = false }: { categories: Category[]; accounts?: boolean; onlinePayments?: boolean }) {
  const { lang, dict } = useI18n();
  const s = dict.shop;
  const items = useCart();
  const [filter, setFilter] = useState<string>("all");
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const toastKey = useRef(0);
  const [openBox, setOpenBox] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const products = useMemo(() => categories.flatMap((c) => c.products), [categories]);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const inCart = items.filter((i) => byId.has(i.id));
  const qtyOf = (id: string) => items.find((i) => i.id === id)?.qty ?? 0;
  const count = inCart.reduce((a, i) => a + i.qty, 0);
  const total = inCart.reduce((a, i) => a + i.qty * byId.get(i.id)!.price, 0);
  const shown = filter === "all" ? products : (categories.find((c) => c.id === filter)?.products ?? []);
  const name = (p: Product) => localized(p.name, lang);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  function add(p: Product) {
    cart.add(p.id);
    toastKey.current += 1;
    setToast({ key: toastKey.current, text: t(s.added, { name: name(p) }) });
  }

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const finishOrder = useCallback(() => {
    setCheckoutOpen(false);
    cart.clear();
  }, []);
  // Static (pre-database) checkout works with the original six boxes.
  const staticLines = lashBoxes.filter((b) => qtyOf(b.id) > 0).map((box) => ({ box, qty: qtyOf(box.id) }));

  return (
    <>
      {categories.length > 1 ? (
        <div className="mb-14 flex flex-wrap justify-center gap-2" role="group" aria-label={dict.shop.marqueeLabel}>
          {[{ id: "all", label: dict.gallery.all }, ...categories.map((c) => ({ id: c.id, label: localized(c.name, lang) }))].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              aria-pressed={filter === c.id}
              className="min-h-11 rounded-full border border-berry/20 px-5 text-sm text-plum transition-colors duration-200 hover:border-berry/60 aria-pressed:border-berry aria-pressed:bg-berry aria-pressed:text-ivory"
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p, i) => {
          const qty = qtyOf(p.id);
          const isOpen = openBox === p.id;
          const tag = !accounts && p.id in s.boxes ? s.boxes[p.id as keyof typeof s.boxes].tag : "";
          return (
            <Reveal as="li" key={`${filter}-${p.id}`} delay={(i % 3) * 110} className={`box-card ${isOpen ? "is-open" : ""} ${i % 3 === 1 ? "lg:mt-12" : ""}`}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenBox((o) => (o === p.id ? null : p.id))}
                  aria-pressed={isOpen}
                  aria-label={t(isOpen ? s.close : s.open, { name: name(p) })}
                  className="block w-full touch-manipulation rounded-[2rem] [-webkit-tap-highlight-color:transparent]"
                >
                  <BoxVisual art={p.art} label={p.name.en || "Serag"} imageUrl={p.imageUrl} index={i} />
                </button>
                {tag ? <span className="absolute -top-3 start-6 rounded-full bg-berry px-3 py-1 text-xs font-semibold text-ivory shadow-lg">{tag}</span> : null}
              </div>

              <div className="mt-6 flex items-baseline justify-between gap-3">
                <h3 className="font-naskh text-2xl text-plum">{name(p)}</h3>
                {p.name.en && name(p) !== p.name.en ? (
                  <span className="font-display text-lg text-berry italic" dir="ltr">
                    {p.name.en}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 min-h-14 text-[0.95rem] leading-7 text-berry-deep/80">{localized(p.description, lang)}</p>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-berry/15 pt-5">
                <span className="font-display text-3xl text-plum">{money(p.price, lang, shop.currency)}</span>
                {qty === 0 ? (
                  <button type="button" onClick={() => add(p)} className="btn btn-berry min-h-12 px-6 text-sm">
                    <Plus className="h-4 w-4" />
                    {s.add}
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-full border border-berry/25 bg-ivory p-1" role="group" aria-label={t(s.qty, { name: name(p) })}>
                    <button type="button" onClick={() => add(p)} aria-label={t(s.inc, { name: name(p) })} className="grid h-10 w-10 place-items-center rounded-full bg-berry text-ivory transition-transform duration-200 active:scale-90">
                      <Plus className="h-4 w-4" />
                    </button>
                    <span key={qty} className="pop min-w-8 text-center font-semibold text-plum tabular-nums" aria-live="polite">
                      {num(qty, lang)}
                    </span>
                    <button type="button" onClick={() => cart.set(p.id, qty - 1)} aria-label={t(s.dec, { name: name(p) })} className="grid h-10 w-10 place-items-center rounded-full text-berry transition-colors duration-200 hover:bg-pink-soft">
                      <Minus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </ul>

      {/* Toast */}
      <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-4" aria-live="polite">
        {toast ? (
          <p key={toast.key} className="slide-up rounded-full bg-plum px-5 py-3 text-sm text-pink-soft shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
            {toast.text}
          </p>
        ) : null}
      </div>

      {/* Cart bar (logical sides keep it clear of the WhatsApp button) */}
      {count > 0 ? (
        <div className="slide-up fixed start-4 end-[5.5rem] bottom-4 z-40 sm:start-8 sm:end-auto sm:bottom-8 sm:w-[25rem]">
          <div className="flex items-center gap-4 rounded-[1.6rem] border border-pink/40 bg-plum/95 p-3 ps-4 text-ivory shadow-[0_30px_60px_-25px_rgba(44,13,28,0.9)] backdrop-blur-xl">
            <Link href={href(lang, "/cart")} aria-label={dict.cart.title} className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink-soft text-plum">
              <Bag className="h-5 w-5" />
              <span key={count} className="pop absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-berry px-1 text-[0.7rem] font-bold text-ivory">
                {num(count, lang)}
              </span>
            </Link>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-xs text-pink-soft/80">{t(s.inCart, { count: boxes(count, lang) })}</span>
              <span className="font-display block text-xl">{money(total, lang, shop.currency)}</span>
            </span>
            {accounts ? (
              <Link href={href(lang, "/checkout")} className="btn btn-pink group min-h-11 shrink-0 px-4 text-sm">
                <span className="hidden sm:inline">{s.checkout}</span>
                <span className="sm:hidden">{s.checkoutShort}</span>
                <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
              </Link>
            ) : (
              <button type="button" onClick={() => setCheckoutOpen(true)} className="btn btn-pink group min-h-11 shrink-0 px-4 text-sm">
                <span className="hidden sm:inline">{s.checkout}</span>
                <span className="sm:hidden">{s.checkoutShort}</span>
                <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
              </button>
            )}
          </div>
        </div>
      ) : null}

      {!accounts && checkoutOpen && staticLines.length > 0 ? <Checkout lines={staticLines} onClose={closeCheckout} onSent={finishOrder} onlineReady={onlinePayments} /> : null}
    </>
  );
}

/** Hero box you can tap to close and re-open (replays the unboxing animation). */
export function HeroBoxPlayer() {
  const { lang, dict } = useI18n();
  const [round, setRound] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setRound((r) => r + 1)}
      aria-label={dict.shop.replay}
      className="block w-full touch-manipulation rounded-[2rem] [-webkit-tap-highlight-color:transparent]"
    >
      <HeroBox key={round} label={dict.shop.heroBox} tag={dict.shop.tag} price={money(shop.boxPrice, lang, shop.currency)} />
    </button>
  );
}
