import { SplitTitle } from "@/components/split-title";
import Link from "next/link";
import { StatusBadge, StatusTracker } from "@/components/account/order-status";
import { PayButton } from "@/components/account/pay-button";
import { Check, Gift, Truck, WhatsApp } from "@/components/icons";
import type { Locale } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/config";
import { date, money, num, points, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import type { OrderDetail } from "@/lib/orders";
import { payplusMethods, type OnlineMethod } from "@/lib/payplus";
import { payments, whatsappLink } from "@/lib/site";
import { PurchaseTracker } from "./purchase-tracker";
import { ReorderButton } from "./reorder-button";

type Flags = { isNew?: boolean; paid?: boolean; failed?: boolean; payError?: boolean };

/** One order: status, items, prices, delivery, tracking, invoice and gift card codes. */
export function OrderView({ order, lang, token = null, flags = {}, signedIn = false }: { order: OrderDetail; lang: Locale; token?: string | null; flags?: Flags; signedIn?: boolean }) {
  const dict = getDictionary(lang);
  const a = dict.account;
  const o = dict.order;
  const so = dict.store.order;
  const fmt = (n: number) => money(n, lang);
  const awaiting = order.status === "awaiting_payment";
  const onlinePay = awaiting && payplusMethods().includes(order.paymentMethod as OnlineMethod);
  const manualBit = awaiting && order.paymentMethod === "bit" && !onlinePay;
  const reorderable = order.items.filter((i) => i.productId && !i.isGiftCard).map((i) => ({ productId: i.productId!, variantId: i.variantId, quantity: i.quantity }));

  return (
    <div className="space-y-8">
      {flags.paid ? <PurchaseTracker number={order.number} total={order.total} items={order.items.map((i) => ({ id: i.productId ?? i.name, name: i.name, price: i.unitPrice, quantity: i.quantity }))} /> : null}
      {flags.isNew || flags.paid ? (
        <div className="flex items-start gap-3 rounded-2xl bg-gold/15 p-5 text-cocoa" role="status">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" />
          <div>
            <p className="font-semibold">{flags.paid ? so.paid : t(so.thanks, { name: order.ship.name.split(" ")[0] })}</p>
            <p className="mt-1 text-sm text-taupe">{so.thanksText}</p>
          </div>
        </div>
      ) : null}
      {flags.failed || flags.payError ? (
        <p className="rounded-2xl bg-rosewood/10 p-4 text-rosewood" role="alert">
          {flags.payError ? dict.store.checkout.errors.payment : so.failed}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <SplitTitle className="font-display text-4xl text-cocoa" text={t(so.title, { number: num(order.number, lang) })} />
          <p className="mt-1 text-sm text-taupe">
            {a.placed}: {date(order.createdAt, lang)}
          </p>
        </div>
        <StatusBadge status={order.status} dict={dict} />
      </div>

      {order.needsShipping ? (
        <section className="rounded-[2rem] border border-cocoa/10 bg-surface p-5 sm:p-8">
          <StatusTracker status={order.status} dict={dict} />
          {order.trackingNumber ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-cocoa/10 pt-5">
              <p className="flex items-center gap-2 text-cocoa">
                <Truck className="h-5 w-5 text-gold-deep" />
                {so.tracking}: {order.carrierName ? `${order.carrierName} · ` : ""}
                <span dir="ltr" className="font-semibold">
                  {order.trackingNumber}
                </span>
              </p>
              {order.trackingUrl ? (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ink min-h-11 px-5 text-sm">
                  {so.track}
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {onlinePay ? (
        <section className="rounded-[2rem] border border-gold/40 bg-surface p-6 sm:p-8">
          <PayButton number={order.number} token={token} />
        </section>
      ) : null}

      {manualBit ? (
        <section className="rounded-[2rem] border border-dashed border-rosewood/40 bg-surface p-6 sm:p-8">
          <p className="leading-8 text-cocoa">{t(a.bitPending, { total: fmt(order.total), phone: payments.bit.display })}</p>
          <a href={whatsappLink(t(a.proofMsg, { brand: dict.brand, number: order.number, total: fmt(order.total) }))} target="_blank" rel="noopener noreferrer" className="btn btn-ink mt-5">
            <WhatsApp className="h-5 w-5" /> {a.sendProof}
          </a>
        </section>
      ) : null}

      {order.items.some((i) => i.isGiftCard) ? (
        <section className="rounded-[2rem] bg-ink-2 p-6 text-ivory sm:p-8">
          <h3 className="flex items-center gap-2 font-semibold">
            <Gift className="h-5 w-5 text-pink" /> {so.giftCards}
          </h3>
          {order.giftCards.length === 0 ? (
            <p className="mt-3 text-sm text-gold-soft/80">{so.giftPending}</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {order.giftCards.map((g) => (
                <li key={g.code} className={`rounded-2xl bg-gradient-to-br from-pink to-pink-deep p-5 text-plum ${g.disabled ? "opacity-50" : ""}`}>
                  <p className="text-xs">{so.giftCode}</p>
                  <p className="mt-1 font-mono text-xl font-semibold tracking-[0.2em]" dir="ltr">
                    {g.code}
                  </p>
                  <p className="mt-3 text-sm">{t(so.giftBalance, { balance: fmt(g.balance), value: fmt(g.value) })}</p>
                  {g.expiresAt ? <p className="text-xs">{t(so.giftExpires, { date: date(g.expiresAt, lang) })}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[2rem] border border-cocoa/10 bg-surface p-6 sm:p-8">
          <h3 className="font-naskh text-2xl text-cocoa">{a.items}</h3>
          <ul className="mt-4 divide-y divide-cocoa/10">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-4 py-3 text-cocoa">
                <span>
                  {i.name}
                  {i.variantName ? <span className="text-taupe"> · {i.variantName}</span> : null} <span className="text-taupe">× {num(i.quantity, lang)}</span>
                </span>
                <span className="text-end tabular-nums">
                  {i.listPrice !== null && i.listPrice * i.quantity > i.lineTotal ? <s className="block text-xs text-taupe">{fmt(i.listPrice * i.quantity)}</s> : null}
                  {fmt(i.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-cocoa/10 pt-4 text-sm text-cocoa">
            <div className="flex justify-between">
              <dt>{o.subtotal}</dt>
              <dd>{fmt(order.subtotal)}</dd>
            </div>
            {order.discountAmount > 0 ? (
              <div className="flex justify-between text-gold-deep">
                <dt>{order.discountKind === "coupon" ? t(o.discountCoupon, { code: order.discountCode ?? "" }) : t(o.discountFirst, { pct: num(Math.round((order.discountAmount / Math.max(1, order.subtotal)) * 100), lang) })}</dt>
                <dd dir="ltr">−{fmt(order.discountAmount)}</dd>
              </div>
            ) : null}
            {order.pointsUsed > 0 ? (
              <div className="flex justify-between text-gold-deep">
                <dt>{t(o.pointsUsed, { points: num(order.pointsUsed, lang) })}</dt>
                <dd dir="ltr">−{fmt(order.pointsValue)}</dd>
              </div>
            ) : null}
            {order.needsShipping ? (
              <div className="flex justify-between">
                <dt>{o.shipping}</dt>
                <dd>{order.shippingFee === 0 ? o.free : fmt(order.shippingFee)}</dd>
              </div>
            ) : null}
            {order.giftCardAmount > 0 ? (
              <div className="flex justify-between text-gold-deep">
                <dt>{so.giftUsed}</dt>
                <dd dir="ltr">−{fmt(order.giftCardAmount)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between border-t border-cocoa/10 pt-3 text-base">
              <dt className="font-semibold">{o.total}</dt>
              <dd className="font-display text-3xl">{fmt(order.total)}</dd>
            </div>
          </dl>
          {order.saleSavings > 0 ? <p className="mt-3 text-sm text-gold-deep">{t(so.savings, { amount: fmt(order.saleSavings) })}</p> : null}
          {order.pointsEarned > 0 && order.status !== "cancelled" ? <p className="mt-2 text-sm text-gold-deep">{t(order.pointsAwarded ? a.earnedDone : a.earnedPending, { points: points(order.pointsEarned, lang) })}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {reorderable.length > 0 && order.status !== "awaiting_payment" ? <ReorderButton items={reorderable} className="min-h-11 px-5 text-sm" /> : null}
            {order.invoiceUrl ? (
              <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-dark min-h-11 px-5 text-sm">
                {so.invoiceOpen}
                {order.invoiceNumber ? <span dir="ltr"> · {order.invoiceNumber}</span> : null}
              </a>
            ) : null}
            {order.status === "delivered" && signedIn && reorderable.length > 0 ? (
              <Link href={href(lang, "/account#reviews")} className="btn btn-ghost-dark min-h-11 px-5 text-sm">
                {dict.store.account.writeReview}
              </Link>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-cocoa/10 bg-surface p-6">
            <h3 className="font-naskh text-xl text-cocoa">{a.shipTo}</h3>
            <p className="mt-3 leading-7 text-taupe">
              {order.ship.name}
              <br />
              <span dir="ltr">{order.ship.phone}</span>
              {order.zoneName ? (
                <>
                  <br />
                  {so.zone}: {order.zoneName}
                </>
              ) : null}
              {order.ship.street ? (
                <>
                  <br />
                  {order.ship.street}, {order.ship.city}
                </>
              ) : null}
              {order.ship.notes ? (
                <>
                  <br />
                  {order.ship.notes}
                </>
              ) : null}
            </p>
            {order.customerNote ? (
              <p className="mt-4 rounded-xl bg-sand/50 px-3 py-2 text-sm text-cocoa">
                {so.note}: {order.customerNote}
              </p>
            ) : null}
          </section>
          <section className="rounded-[2rem] border border-cocoa/10 bg-surface p-6">
            <h3 className="font-naskh text-xl text-cocoa">{a.payment}</h3>
            <p className="mt-3 text-taupe">
              {o.methods[order.paymentMethod]} · {o.payment[order.paymentStatus as keyof typeof o.payment] ?? order.paymentStatus}
            </p>
          </section>
          <section className="rounded-[2rem] border border-cocoa/10 bg-surface p-6">
            <h3 className="font-naskh text-xl text-cocoa">{a.timeline}</h3>
            <ol className="mt-3 space-y-2 text-sm text-taupe">
              {order.events.map((e, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{o.statuses[e.status as keyof typeof o.statuses] ?? e.status}</span>
                  <span>{date(e.createdAt, lang)}</span>
                </li>
              ))}
            </ol>
          </section>
          {!signedIn ? <p className="text-sm text-taupe">{so.loginToSee}</p> : null}
        </aside>
      </div>
    </div>
  );
}
