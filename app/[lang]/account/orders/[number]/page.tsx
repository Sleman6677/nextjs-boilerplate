import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusBadge, StatusTracker } from "@/components/account/order-status";
import { PayButton } from "@/components/account/pay-button";
import { ArrowForward, Check, WhatsApp } from "@/components/icons";
import { currentUser } from "@/lib/auth";
import { href, isLocale } from "@/lib/i18n/config";
import { date, money, num, points, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { getOrderForUser } from "@/lib/orders";
import { payplusMethods, type OnlineMethod } from "@/lib/payplus";
import { payments, shop, whatsappLink } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/orders/[number]">): Promise<Metadata> {
  const { lang, number } = await params;
  if (!isLocale(lang)) return {};
  return { title: t(getDictionary(lang).order.number, { number }), robots: { index: false } };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/[lang]/account/orders/[number]">) {
  const { lang, number } = await params;
  if (!isLocale(lang) || !/^\d{1,12}$/.test(number)) notFound();
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/account/orders/${number}`));
  const order = await getOrderForUser(user.id, Number(number));
  if (!order) notFound();

  const dict = getDictionary(lang);
  const a = dict.account;
  const o = dict.order;
  const q = await searchParams;
  const fmt = (n: number) => money(n, lang, shop.currency);
  const awaiting = order.status === "awaiting_payment";
  const onlinePay = awaiting && payplusMethods().includes(order.paymentMethod as OnlineMethod);
  const manualBit = awaiting && order.paymentMethod === "bit" && !onlinePay;

  return (
    <div className="space-y-8">
      <Link href={href(lang, "/account")} className="group inline-flex min-h-11 items-center gap-2 text-sm text-cocoa">
        <ArrowForward className="h-4 w-4 rotate-180" /> {a.back}
      </Link>

      {q.new || q.paid ? (
        <p className="flex items-center gap-3 rounded-2xl bg-gold/15 p-4 text-cocoa" role="status">
          <Check className="h-5 w-5 text-gold-deep" /> {t(a.thanks, { number: num(order.number, lang) })}
        </p>
      ) : null}
      {q.failed || q.payerror ? (
        <p className="rounded-2xl bg-rosewood/10 p-4 text-rosewood" role="alert">
          {q.payerror ? dict.pay.errors.payment : dict.orderResult.failLead}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl text-cocoa">{t(o.number, { number: num(order.number, lang) })}</h2>
          <p className="mt-1 text-sm text-taupe">
            {a.placed}: {date(order.createdAt, lang)}
          </p>
        </div>
        <StatusBadge status={order.status} dict={dict} />
      </div>

      <section className="rounded-[2rem] border border-cocoa/10 bg-ivory p-6 sm:p-8">
        <StatusTracker status={order.status} dict={dict} />
      </section>

      {onlinePay ? (
        <section className="rounded-[2rem] border border-gold/40 bg-ivory p-6 sm:p-8">
          <PayButton number={order.number} />
        </section>
      ) : null}

      {manualBit ? (
        <section className="rounded-[2rem] border border-dashed border-rosewood/40 bg-ivory p-6 sm:p-8">
          <p className="leading-8 text-cocoa">{t(a.bitPending, { total: fmt(order.total), phone: payments.bit.display })}</p>
          <a
            href={whatsappLink(t(a.proofMsg, { brand: dict.brand, number: order.number, total: fmt(order.total) }))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ink mt-5"
          >
            <WhatsApp className="h-5 w-5" /> {a.sendProof}
          </a>
        </section>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[2rem] border border-cocoa/10 bg-ivory p-6 sm:p-8">
          <h3 className="font-naskh text-2xl text-cocoa">{a.items}</h3>
          <ul className="mt-4 divide-y divide-cocoa/10">
            {order.items.map((i) => (
              <li key={i.name} className="flex justify-between gap-4 py-3 text-cocoa">
                <span>
                  {i.name} <span className="text-taupe">× {num(i.quantity, lang)}</span>
                </span>
                <span className="tabular-nums">{fmt(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-cocoa/10 pt-4 text-sm text-cocoa">
            <div className="flex justify-between"><dt>{o.subtotal}</dt><dd>{fmt(order.subtotal)}</dd></div>
            {order.discountAmount > 0 ? (
              <div className="flex justify-between text-gold-deep">
                <dt>{order.discountKind === "coupon" ? t(o.discountCoupon, { code: order.discountCode ?? "" }) : t(o.discountFirst, { pct: num(Math.round((order.discountAmount / order.subtotal) * 100), lang) })}</dt>
                <dd>−{fmt(order.discountAmount)}</dd>
              </div>
            ) : null}
            {order.pointsUsed > 0 ? (
              <div className="flex justify-between text-gold-deep"><dt>{t(o.pointsUsed, { points: num(order.pointsUsed, lang) })}</dt><dd>−{fmt(order.pointsValue)}</dd></div>
            ) : null}
            <div className="flex justify-between"><dt>{o.shipping}</dt><dd>{order.shippingFee === 0 ? o.free : fmt(order.shippingFee)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-cocoa/10 pt-3 text-base">
              <dt className="font-semibold">{o.total}</dt>
              <dd className="font-display text-3xl">{fmt(order.total)}</dd>
            </div>
          </dl>
          {order.pointsEarned > 0 && order.status !== "cancelled" ? (
            <p className="mt-4 text-sm text-gold-deep">{t(order.pointsAwarded ? a.earnedDone : a.earnedPending, { points: points(order.pointsEarned, lang) })}</p>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-cocoa/10 bg-ivory p-6">
            <h3 className="font-naskh text-xl text-cocoa">{a.shipTo}</h3>
            <p className="mt-3 leading-7 text-taupe">
              {order.ship.name}
              <br />
              <span dir="ltr">{order.ship.phone}</span>
              <br />
              {order.ship.street}, {order.ship.city}
              {order.ship.notes ? (
                <>
                  <br />
                  {order.ship.notes}
                </>
              ) : null}
            </p>
          </section>
          <section className="rounded-[2rem] border border-cocoa/10 bg-ivory p-6">
            <h3 className="font-naskh text-xl text-cocoa">{a.payment}</h3>
            <p className="mt-3 text-taupe">
              {o.methods[order.paymentMethod]} · {o.payment[order.paymentStatus as keyof typeof o.payment] ?? order.paymentStatus}
            </p>
          </section>
          <section className="rounded-[2rem] border border-cocoa/10 bg-ivory p-6">
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
        </aside>
      </div>
    </div>
  );
}
