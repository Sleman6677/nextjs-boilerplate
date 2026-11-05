"use client";

import { useCallback, useEffect, useState } from "react";
import { boxes, money, num, t } from "@/lib/i18n/format";
import { lashBoxes, shop } from "@/lib/site";
import { Checkout } from "./checkout";
import { useI18n } from "./i18n-provider";
import { ArrowForward, Bag, Minus, Plus } from "./icons";
import { BoxVisual, HeroBox } from "./lash-box";
import { Reveal } from "./reveal";

type Cart = Record<string, number>;

export function ShopCatalog({ onlinePayments = false }: { onlinePayments?: boolean }) {
  const { lang, dict } = useI18n();
  const s = dict.shop;
  const [cart, setCart] = useState<Cart>({});
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [openBox, setOpenBox] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = count * shop.boxPrice;

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  function change(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
    if (delta > 0) {
      const box = lashBoxes.find((b) => b.id === id);
      setToast({ key: Date.now(), text: t(s.added, { name: box ? s.boxes[box.id].name : "" }) });
    }
  }

  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const finishOrder = useCallback(() => {
    setCheckoutOpen(false);
    setCart({});
  }, []);
  const lines = lashBoxes.filter((b) => cart[b.id]).map((box) => ({ box, qty: cart[box.id] }));

  return (
    <>
      <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {lashBoxes.map((item, i) => {
          const qty = cart[item.id] ?? 0;
          const text = s.boxes[item.id];
          const isOpen = openBox === item.id;
          return (
            <Reveal as="li" key={item.id} delay={(i % 3) * 110} className={`box-card ${isOpen ? "is-open" : ""} ${i % 3 === 1 ? "lg:mt-12" : ""}`}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenBox((o) => (o === item.id ? null : item.id))}
                  aria-pressed={isOpen}
                  aria-label={t(isOpen ? s.close : s.open, { name: text.name })}
                  className="block w-full touch-manipulation rounded-[2rem] [-webkit-tap-highlight-color:transparent]"
                >
                  <BoxVisual item={item} index={i} />
                </button>
                {text.tag ? <span className="absolute -top-3 start-6 rounded-full bg-berry px-3 py-1 text-xs font-semibold text-ivory shadow-lg">{text.tag}</span> : null}
              </div>

              <div className="mt-6 flex items-baseline justify-between gap-3">
                <h3 className="font-naskh text-2xl text-plum">{text.name}</h3>
                {text.name !== item.latin ? (
                  <span className="font-display text-lg text-berry italic" dir="ltr">
                    {item.latin}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 min-h-14 text-[0.95rem] leading-7 text-berry-deep/80">{text.look}</p>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-berry/15 pt-5">
                <span className="font-display text-3xl text-plum">{money(shop.boxPrice, lang, shop.currency)}</span>

                {qty === 0 ? (
                  <button type="button" onClick={() => change(item.id, 1)} className="btn btn-berry min-h-12 px-6 text-sm">
                    <Plus className="h-4 w-4" />
                    {s.add}
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-full border border-berry/25 bg-ivory p-1" role="group" aria-label={t(s.qty, { name: text.name })}>
                    <button type="button" onClick={() => change(item.id, 1)} aria-label={t(s.inc, { name: text.name })} className="grid h-10 w-10 place-items-center rounded-full bg-berry text-ivory transition-transform duration-200 active:scale-90">
                      <Plus className="h-4 w-4" />
                    </button>
                    <span key={qty} className="pop min-w-8 text-center font-semibold text-plum tabular-nums" aria-live="polite">
                      {num(qty, lang)}
                    </span>
                    <button type="button" onClick={() => change(item.id, -1)} aria-label={t(s.dec, { name: text.name })} className="grid h-10 w-10 place-items-center rounded-full text-berry transition-colors duration-200 hover:bg-pink-soft">
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

      {/* Cart bar (logical sides: start = right in RTL, left in LTR; leaves room for the WhatsApp button at the end) */}
      {count > 0 ? (
        <div className="slide-up fixed start-4 end-[5.5rem] bottom-4 z-40 sm:start-8 sm:end-auto sm:bottom-8 sm:w-[25rem]">
          <div className="flex items-center gap-4 rounded-[1.6rem] border border-pink/40 bg-plum/95 p-3 ps-4 text-ivory shadow-[0_30px_60px_-25px_rgba(44,13,28,0.9)] backdrop-blur-xl">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink-soft text-plum">
              <Bag className="h-5 w-5" />
              <span key={count} className="pop absolute -top-1 -end-1 grid h-5 min-w-5 place-items-center rounded-full bg-berry px-1 text-[0.7rem] font-bold text-ivory">
                {num(count, lang)}
              </span>
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-xs text-pink-soft/80">{t(s.inCart, { count: boxes(count, lang) })}</span>
              <span className="font-display block text-xl">{money(total, lang, shop.currency)}</span>
            </span>
            <button type="button" onClick={() => setCheckoutOpen(true)} className="btn btn-pink group min-h-11 shrink-0 px-4 text-sm">
              <span className="hidden sm:inline">{s.checkout}</span>
              <span className="sm:hidden">{s.checkoutShort}</span>
              <ArrowForward className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      ) : null}

      {checkoutOpen && lines.length > 0 ? <Checkout lines={lines} onClose={closeCheckout} onSent={finishOrder} onlineReady={onlinePayments} /> : null}
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
