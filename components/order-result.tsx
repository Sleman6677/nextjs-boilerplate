"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { arDigits, payments, shop, site, whatsappLink } from "@/lib/site";
import { ORDER_STORAGE_KEY, type SavedOrder } from "./checkout";
import { Check, Close, WhatsApp } from "./icons";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStorage(): string | null {
  try {
    return sessionStorage.getItem(ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
}

const money = (n: number) => `${arDigits(n)} ${shop.currency}`;

/** Shown after returning from the PayPlus payment page. */
export function OrderResult({ kind }: { kind: "success" | "failure" }) {
  const raw = useSyncExternalStore(subscribe, readStorage, () => null);
  const order = useMemo<SavedOrder | null>(() => {
    try {
      return raw ? (JSON.parse(raw) as SavedOrder) : null;
    } catch {
      return null;
    }
  }, [raw]);

  const details = order
    ? [
        order.ref ? `رقم الطلب: ${order.ref}` : null,
        ...order.lines.map((l) => `• ${l.name} × ${l.qty}`),
        `المجموع: ${order.total} ${shop.currency}`,
        `الاسم: ${order.name}`,
        `الهاتف: ${order.phone}`,
        `العنوان: ${order.address}`,
      ].filter((l) => l !== null)
    : [];

  const success = kind === "success";
  const whatsappText = success
    ? [`مرحبًا ${site.nameAr}، أتممتُ الدفع عبر PayPlus.`, ...details].join("\n")
    : [
        `مرحبًا ${site.nameAr}، لم يكتمل الدفع بالبطاقة، أودّ الدفع عبر Bit إلى ${payments.bit.display}.`,
        ...details,
      ].join("\n");

  return (
    <div className="mx-auto max-w-xl text-center">
      <span className={`pop mx-auto grid h-20 w-20 place-items-center rounded-full ${success ? "bg-pink text-plum" : "bg-ivory/15 text-pink-soft"}`}>
        {success ? <Check className="h-9 w-9" /> : <Close className="h-9 w-9" />}
      </span>
      <h1 className="font-display mt-8 text-4xl leading-snug text-ivory sm:text-5xl">
        {success ? (order?.name ? `شكرًا لكِ يا ${order.name}` : "شكرًا لكِ") : "لم يكتمل الدفع"}
      </h1>
      <p className="mt-5 text-lg leading-8 text-ivory/80">
        {success
          ? "وصلنا طلبكِ. أرسلي لنا تأكيدًا عبر واتساب لنرتّب معكِ التوصيل."
          : "يمكنكِ المحاولة مجددًا بالبطاقة، أو إكمال الطلب نفسه بالدفع عبر Bit."}
      </p>

      {order ? (
        <div className="mt-10 rounded-[1.75rem] bg-ivory p-6 text-start text-plum">
          {order.ref ? (
            <p className="text-sm text-berry-deep/70">
              رقم الطلب{" "}
              <span className="font-semibold text-plum" dir="ltr">
                {order.ref}
              </span>
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {order.lines.map((l) => (
              <li key={l.name} className="flex justify-between gap-3">
                <span>{l.name}</span>
                <span className="text-berry-deep/70">× {arDigits(l.qty)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t border-berry/10 pt-4 font-semibold">
            <span>المجموع</span>
            <span className="font-display text-2xl">{money(order.total)}</span>
          </p>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a href={whatsappLink(whatsappText)} target="_blank" rel="noopener noreferrer" className="btn btn-pink">
          <WhatsApp className="h-5 w-5" />
          {success ? "أرسلي تأكيد الطلب" : "الدفع عبر Bit"}
        </a>
        <Link href="/shop#collection" className="btn btn-ghost-light">
          {success ? "متابعة التسوق" : "المحاولة مجددًا"}
        </Link>
      </div>
    </div>
  );
}
