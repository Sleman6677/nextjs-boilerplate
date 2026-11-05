"use client";

import { useEffect, useState } from "react";
import { arDigits, lashBoxes, shop, site, whatsappLink } from "@/lib/site";
import { Bag, Minus, Plus, WhatsApp } from "./icons";
import { BoxVisual, HeroBox } from "./lash-box";
import { Reveal } from "./reveal";

type Cart = Record<string, number>;

const price = (n: number) => `${arDigits(n)} ${shop.currency}`;

/** Arabic number agreement: علبة واحدة، علبتان، ٣–١٠ علب، ١١+ علبة */
function boxes(n: number) {
  if (n === 1) return "علبة واحدة";
  if (n === 2) return "علبتان";
  if (n >= 3 && n <= 10) return `${arDigits(n)} علب`;
  return `${arDigits(n)} علبة`;
}

export function ShopCatalog() {
  const [cart, setCart] = useState<Cart>({});
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);
  const [openBox, setOpenBox] = useState<string | null>(null);

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
      const name = lashBoxes.find((b) => b.id === id)?.name ?? "";
      setToast({ key: Date.now(), text: `أُضيفت «${name}» إلى السلة` });
    }
  }

  function order() {
    const lines = [
      `مرحبًا ${site.nameAr}، أودّ طلب رموش يومية:`,
      ...lashBoxes.filter((b) => cart[b.id]).map((b) => `• ${b.name} (${b.latin}) × ${cart[b.id]}`),
      `عدد العلب: ${count}`,
      `المجموع: ${total} ${shop.currency}`,
    ];
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {lashBoxes.map((item, i) => {
          const qty = cart[item.id] ?? 0;
          return (
            <Reveal
              as="li"
              key={item.id}
              delay={(i % 3) * 110}
              className={`box-card ${openBox === item.id ? "is-open" : ""} ${i % 3 === 1 ? "lg:mt-12" : ""}`}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenBox((o) => (o === item.id ? null : item.id))}
                  aria-pressed={openBox === item.id}
                  aria-label={`${openBox === item.id ? "أغلقي" : "افتحي"} علبة ${item.name}`}
                  className="block w-full touch-manipulation rounded-[2rem] [-webkit-tap-highlight-color:transparent]"
                >
                  <BoxVisual item={item} index={i} />
                </button>
                {item.tag ? (
                  <span className="absolute -top-3 right-6 rounded-full bg-berry px-3 py-1 text-xs font-semibold text-ivory shadow-lg">{item.tag}</span>
                ) : null}
              </div>

              <div className="mt-6 flex items-baseline justify-between gap-3">
                <h3 className="font-naskh text-2xl text-plum">{item.name}</h3>
                <span className="font-display text-lg text-berry italic" dir="ltr">
                  {item.latin}
                </span>
              </div>
              <p className="mt-2 min-h-14 text-[0.95rem] leading-7 text-berry-deep/80">{item.look}</p>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-berry/15 pt-5">
                <span className="font-display text-3xl text-plum">
                  {arDigits(shop.boxPrice)} <span className="text-2xl">{shop.currency}</span>
                </span>

                {qty === 0 ? (
                  <button type="button" onClick={() => change(item.id, 1)} className="btn btn-berry min-h-12 px-6 text-sm">
                    <Plus className="h-4 w-4" />
                    أضيفي للسلة
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-full border border-berry/25 bg-ivory p-1" role="group" aria-label={`كمية ${item.name}`}>
                    <button type="button" onClick={() => change(item.id, 1)} aria-label={`زيادة ${item.name}`} className="grid h-10 w-10 place-items-center rounded-full bg-berry text-ivory transition-transform duration-200 active:scale-90">
                      <Plus className="h-4 w-4" />
                    </button>
                    <span key={qty} className="pop min-w-8 text-center font-semibold text-plum tabular-nums" aria-live="polite">
                      {arDigits(qty)}
                    </span>
                    <button type="button" onClick={() => change(item.id, -1)} aria-label={`إنقاص ${item.name}`} className="grid h-10 w-10 place-items-center rounded-full text-berry transition-colors duration-200 hover:bg-pink-soft">
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

      {/* Cart bar */}
      {count > 0 ? (
        <div className="slide-up fixed right-4 bottom-4 left-[5.5rem] z-40 sm:right-8 sm:bottom-8 sm:left-auto sm:w-[25rem]">
          <div className="flex items-center gap-4 rounded-[1.6rem] border border-pink/40 bg-plum/95 p-3 ps-4 text-ivory shadow-[0_30px_60px_-25px_rgba(44,13,28,0.9)] backdrop-blur-xl">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink-soft text-plum">
              <Bag className="h-5 w-5" />
              <span key={count} className="pop absolute -top-1 -left-1 grid h-5 min-w-5 place-items-center rounded-full bg-berry px-1 text-[0.7rem] font-bold text-ivory">
                {arDigits(count)}
              </span>
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-xs text-pink-soft/80">{boxes(count)} في السلة</span>
              <span className="font-display block text-xl">{price(total)}</span>
            </span>
            <button type="button" onClick={order} className="btn btn-pink min-h-11 shrink-0 px-4 text-sm">
              <WhatsApp className="h-5 w-5" />
              <span className="hidden sm:inline">اطلبي عبر واتساب</span>
              <span className="sm:hidden">اطلبي</span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Hero box you can tap to close and re-open (replays the unboxing animation). */
export function HeroBoxPlayer() {
  const [round, setRound] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setRound((r) => r + 1)}
      aria-label="أعيدي فتح العلبة"
      className="block w-full touch-manipulation rounded-[2rem] [-webkit-tap-highlight-color:transparent]"
    >
      <HeroBox key={round} />
    </button>
  );
}
