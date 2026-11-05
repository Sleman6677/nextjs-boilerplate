"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { href } from "@/lib/i18n/config";
import { money as fmtMoney, num, t } from "@/lib/i18n/format";
import { payments, shop, whatsappLink } from "@/lib/site";
import { useI18n } from "./i18n-provider";
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


/** Shown after returning from the PayPlus payment page. */
export function OrderResult({ kind }: { kind: "success" | "failure" }) {
  const { lang, dict } = useI18n();
  const r = dict.orderResult;
  const m = dict.checkout.msg;
  const money = (n: number) => fmtMoney(n, lang, shop.currency);
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
        order.ref ? `${r.orderNo}: ${order.ref}` : null,
        ...order.lines.map((l) => `• ${l.name} × ${l.qty}`),
        `${m.total}: ${order.total} ${shop.currency}`,
        `${m.name}: ${order.name}`,
        `${m.phone}: ${order.phone}`,
        `${m.address}: ${order.address}`,
      ].filter((l) => l !== null)
    : [];

  const success = kind === "success";
  const whatsappText = success
    ? [t(r.msgSuccess, { brand: dict.brand }), ...details].join("\n")
    : [
        t(r.msgFail, { brand: dict.brand, phone: payments.bit.display }),
        ...details,
      ].join("\n");

  return (
    <div className="mx-auto max-w-xl text-center">
      <span className={`pop mx-auto grid h-20 w-20 place-items-center rounded-full ${success ? "bg-pink text-plum" : "bg-ivory/15 text-pink-soft"}`}>
        {success ? <Check className="h-9 w-9" /> : <Close className="h-9 w-9" />}
      </span>
      <h1 className="font-display mt-8 text-4xl leading-snug text-ivory sm:text-5xl">
        {success ? (order?.name ? t(r.successName, { name: order.name }) : r.success) : r.fail}
      </h1>
      <p className="mt-5 text-lg leading-8 text-ivory/80">
        {success
          ? r.successLead
          : r.failLead}
      </p>

      {order ? (
        <div className="mt-10 rounded-[1.75rem] bg-ivory p-6 text-start text-plum">
          {order.ref ? (
            <p className="text-sm text-berry-deep/70">
              {r.orderNo}{" "}
              <span className="font-semibold text-plum" dir="ltr">
                {order.ref}
              </span>
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {order.lines.map((l) => (
              <li key={l.name} className="flex justify-between gap-3">
                <span>{l.name}</span>
                <span className="text-berry-deep/70">× {num(l.qty, lang)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t border-berry/10 pt-4 font-semibold">
            <span>{r.total}</span>
            <span className="font-display text-2xl">{money(order.total)}</span>
          </p>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <a href={whatsappLink(whatsappText)} target="_blank" rel="noopener noreferrer" className="btn btn-pink">
          <WhatsApp className="h-5 w-5" />
          {success ? r.confirm : r.payBit}
        </a>
        <Link href={href(lang, "/shop#collection")} className="btn btn-ghost-light">
          {success ? r.continue : r.retry}
        </Link>
      </div>
    </div>
  );
}
