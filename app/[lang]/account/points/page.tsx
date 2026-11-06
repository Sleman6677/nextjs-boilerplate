import { notFound, redirect } from "next/navigation";
import { nextExpiry, pointsHistory } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { href, isLocale } from "@/lib/i18n/config";
import { date, money, num, t } from "@/lib/i18n/format";
import { getDictionary } from "@/lib/i18n";
import { getSettings, pointsBalance } from "@/lib/orders";
import { shop } from "@/lib/site";

export default async function PointsPage({ params }: PageProps<"/[lang]/account/points">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const user = await currentUser();
  if (!user) redirect(href(lang, `/login?next=/${lang}/account/points`));
  const dict = getDictionary(lang);
  const pt = dict.account.points;
  const [history, balance, settings, expiry] = await Promise.all([pointsHistory(user.id), pointsBalance(user.id), getSettings(), nextExpiry(user.id)]);
  const fmt = (n: number) => money(n, lang, shop.currency);

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_2fr]">
      <aside className="h-fit rounded-[2rem] bg-gradient-to-br from-gold-soft via-gold to-gold-deep p-7 text-ink">
        <p className="text-sm font-semibold">{dict.account.pointsBalance}</p>
        <p className="font-display mt-2 text-6xl">{num(balance, lang)}</p>
        <p className="mt-2 text-sm">{t(dict.account.pointsWorth, { value: fmt(balance * settings.pointValue) })}</p>
        <p className="mt-5 text-sm leading-6">{t(pt.how, { pct: num(settings.pointsEarnPct, lang), value: fmt(settings.pointValue) })}</p>
        <p className="mt-3 text-sm font-semibold">
          {expiry ? t(dict.store.account.pointsExpire, { points: num(expiry.points, lang), date: date(expiry.date, lang) }) : settings.pointsExpiryMonths ? "" : dict.store.account.pointsNever}
        </p>
      </aside>
      <div>
        <h2 className="font-naskh mb-4 text-2xl text-cocoa">{pt.history}</h2>
        {history.length === 0 ? (
          <p className="rounded-[1.75rem] border border-cocoa/10 bg-ivory p-6 text-taupe">{pt.empty}</p>
        ) : (
          <ul className="divide-y divide-cocoa/10 overflow-hidden rounded-[1.75rem] border border-cocoa/10 bg-ivory">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between gap-4 p-5">
                <span>
                  <span className="block text-cocoa">{t(pt.reasons[h.reason], { number: h.orderNumber ? num(h.orderNumber, lang) : "" })}</span>
                  <span className="block text-sm text-taupe">{date(h.createdAt, lang)}</span>
                </span>
                <span className={`font-display text-2xl tabular-nums ${h.delta > 0 ? "text-gold-deep" : "text-rosewood"}`} dir="ltr">
                  {h.delta > 0 ? "+" : "−"}
                  {num(Math.abs(h.delta), lang)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
