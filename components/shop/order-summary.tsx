"use client";

import type { QuoteResult } from "@/lib/orders";
import { money, num, points as pointsLabel, t } from "@/lib/i18n/format";
import { useI18n } from "../i18n-provider";

/** Price breakdown shared by the cart and checkout (always from the server's quote). */
export function OrderSummary({ quote, busy }: { quote: QuoteResult | null; busy?: boolean }) {
  const { lang, dict } = useI18n();
  const c = dict.store.cart;
  if (!quote) return <div className="h-48 animate-pulse rounded-2xl bg-pink-soft/30" aria-busy="true" />;
  const fmt = (n: number) => money(n, lang);
  const rows: { label: string; value: string; tone?: string; dir?: "ltr" }[] = [];
  if (quote.saleSavings > 0) rows.push({ label: c.listSubtotal, value: fmt(quote.listSubtotal) }, { label: c.savings, value: `−${fmt(quote.saleSavings)}`, tone: "text-pink", dir: "ltr" });
  rows.push({ label: c.subtotal, value: fmt(quote.subtotal) });
  if (quote.discountAmount > 0) {
    rows.push({
      label: quote.discountKind === "coupon" ? t(c.discountCoupon, { code: quote.discountCode ?? "" }) : t(c.discountFirst, { pct: num(quote.discountPct ?? 0, lang) }),
      value: `−${fmt(quote.discountAmount)}`,
      tone: "text-pink",
      dir: "ltr",
    });
  }
  if (quote.pointsUsed > 0) rows.push({ label: t(c.pointsUsed, { points: pointsLabel(quote.pointsUsed, lang) }), value: `−${fmt(quote.pointsValue)}`, tone: "text-pink", dir: "ltr" });
  if (quote.needsShipping) rows.push({ label: c.shipping, value: !quote.shippingKnown ? c.shippingLater : quote.shippingFee === 0 ? c.free : fmt(quote.shippingFee) });
  if (quote.giftCardApplied > 0) rows.push({ label: c.giftUsed, value: `−${fmt(quote.giftCardApplied)}`, tone: "text-pink", dir: "ltr" });

  return (
    <div aria-busy={busy} className={busy ? "opacity-70 transition-opacity" : "transition-opacity"}>
      <dl className="space-y-2.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className={`flex justify-between gap-4 ${r.tone ?? "text-pink-soft/85"}`}>
            <dt>{r.label}</dt>
            <dd dir={r.dir}>{r.value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-pink-soft/20 pt-4 text-ivory">
          <dt className="font-semibold">{c.total}</dt>
          <dd className="font-display text-4xl">{fmt(quote.total)}</dd>
        </div>
      </dl>
      {quote.freeShippingRemaining !== null && quote.freeShippingRemaining > 0 ? <p className="mt-4 rounded-xl bg-pink-soft/10 px-3 py-2 text-xs text-pink-soft">{t(c.freeLeft, { amount: fmt(quote.freeShippingRemaining) })}</p> : null}
      {quote.pointsEarned > 0 ? <p className="mt-3 text-xs text-pink-soft/80">{t(c.earn, { points: pointsLabel(quote.pointsEarned, lang) })}</p> : null}
    </div>
  );
}
