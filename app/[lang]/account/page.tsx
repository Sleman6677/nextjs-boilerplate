import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusBadge } from "@/components/account/order-status";
import { ReviewForm } from "@/components/account/review-form";
import { personalCoupons, reviewable } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { href, isLocale } from "@/lib/i18n/config";
import { date, items as itemsLabel, money, num, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { ACTIVE_STATUSES, getSettings, listOrders, pointsBalance, type OrderSummary } from "@/lib/orders";
import { shop } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return { title: getDictionary(lang).account.metaTitle, robots: { index: false } };
}

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/account`));
  const dict = getDictionary(lang);
  const a = dict.account;
  const [orders, balance, settings, coupons, toReview] = await Promise.all([listOrders(user.id), pointsBalance(user.id), getSettings(), personalCoupons(user.id), reviewable(user.id)]);
  const sa = dict.store.account;
  const current = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  const fmt = (n: number) => money(n, lang, shop.currency);

  const list = (rows: OrderSummary[]) => (
    <ul className="divide-y divide-cocoa/10 overflow-hidden rounded-[1.75rem] border border-cocoa/10 bg-ivory">
      {rows.map((o) => (
        <li key={o.id}>
          <Link href={href(lang, `/account/orders/${o.number}`)} className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-sand/40">
            <span>
              <span className="block font-semibold text-cocoa">{t(dict.store.order.title, { number: num(o.number, lang) })}</span>
              <span className="block text-sm text-taupe">
                {date(o.createdAt, lang)} · {itemsLabel(o.itemCount, lang)}
              </span>
            </span>
            <span className="flex items-center gap-4">
              <StatusBadge status={o.status} dict={dict} />
              <span className="font-display text-xl text-cocoa">{fmt(o.total)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
      <aside className="space-y-6">
        <div className="rounded-[2rem] bg-gradient-to-br from-gold-soft via-gold to-gold-deep p-7 text-ink">
          <p className="text-sm font-semibold">{a.pointsBalance}</p>
          <p className="font-display mt-2 text-6xl">{num(balance, lang)}</p>
          <p className="mt-2 text-sm">{t(a.pointsWorth, { value: fmt(balance * settings.pointValue) })}</p>
          <Link href={href(lang, "/account/points")} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
            {a.nav.points}
          </Link>
        </div>
        <section className="rounded-[2rem] border border-cocoa/10 bg-ivory p-6">
          <h2 className="font-naskh text-xl text-cocoa">{sa.coupons}</h2>
          {coupons.length === 0 ? (
            <p className="mt-2 text-sm text-taupe">{sa.couponsEmpty}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {coupons.map((c) => (
                <li key={c.code} className="rounded-2xl border border-dashed border-gold-deep/40 p-4">
                  <p className="font-mono text-lg font-semibold tracking-widest text-cocoa" dir="ltr">
                    {c.code}
                  </p>
                  <p className="text-sm text-taupe">
                    {c.kind === "percent" ? `${num(c.value, lang)}${lang === "ar" ? "٪" : "%"}` : fmt(c.value)}
                    {c.endsAt ? ` · ${t(sa.couponUntil, { date: date(c.endsAt, lang) })}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      <div className="space-y-10">
        <section>
          <h2 className="font-naskh mb-4 text-2xl text-cocoa">{a.current}</h2>
          {current.length ? list(current) : <p className="rounded-[1.75rem] border border-cocoa/10 bg-ivory p-6 text-taupe">{a.none}</p>}
        </section>
        {past.length ? (
          <section>
            <h2 className="font-naskh mb-4 text-2xl text-cocoa">{a.past}</h2>
            {list(past)}
          </section>
        ) : null}
        {toReview.length ? (
          <section id="reviews" className="scroll-mt-28">
            <h2 className="font-naskh mb-4 text-2xl text-cocoa">{sa.reviewsTodo}</h2>
            <ul className="space-y-4">
              {toReview.slice(0, 5).map((r) => (
                <li key={r.productId} className="rounded-[1.75rem] border border-cocoa/10 bg-ivory p-5">
                  <ReviewForm productId={r.productId} name={r.name} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {orders.length === 0 ? (
          <Link href={href(lang, "/shop")} className="btn btn-ink">
            {a.shopNow}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
