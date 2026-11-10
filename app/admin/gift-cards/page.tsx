import type { Metadata } from "next";
import Link from "next/link";
import { setGiftCardDisabled } from "@/app/actions/admin-marketing";
import { ActionButton } from "@/components/admin/action-button";
import { IssueGiftCardForm } from "@/components/admin/marketing-forms";
import { Card, Empty, field, NoAccess, PageHeader } from "@/components/admin/ui";
import { day, shekel, when } from "@/lib/admin-format";
import { adminGiftCards } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export const metadata: Metadata = { title: "بطاقات الهدية" };
const STATUS = { unused: ["غير مستعملة", "bg-emerald-700/10 text-emerald-800"], partial: ["مستعملة جزئيًا", "bg-gold/20 text-gold-deep"], used: ["مستعملة بالكامل", "bg-ivory/10 text-taupe"], expired: ["منتهية", "bg-rosewood/10 text-rosewood"], disabled: ["موقوفة", "bg-rosewood/10 text-rosewood"] } as const;

export default async function GiftCards({ searchParams }: PageProps<"/admin/gift-cards">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const q = (await searchParams).q;
  const [cards, s] = await Promise.all([adminGiftCards(typeof q === "string" ? q : ""), getSettings()]);
  return (
    <>
      <PageHeader
        title="بطاقات الهدية"
        subtitle={`الزيادة الحالية ${s.giftCardBonusPct}٪ · الصلاحية ${s.giftCardValidMonths ? `${s.giftCardValidMonths} شهرًا` : "بلا انتهاء"}`}
        action={
          <Link href="/admin/products/new?kind=gift_card" className="btn btn-ghost-dark min-h-11 px-5 text-sm">
            قيم البطاقات في المتجر
          </Link>
        }
      />
      <Card title="إصدار بطاقة يدويًا (تعويض، هدية، مسابقة…)" className="mb-6">
        <IssueGiftCardForm />
      </Card>
      <form action="/admin/gift-cards" className="mb-5 flex gap-2" role="search">
        <label htmlFor="gq" className="sr-only">
          بحث بالكود
        </label>
        <input id="gq" name="q" defaultValue={typeof q === "string" ? q : ""} placeholder="بحث بالكود" dir="ltr" className={`${field} mt-0 rtl:text-right`} />
        <button type="submit" className="btn btn-ink min-h-12 shrink-0 px-6">
          بحث
        </button>
      </form>
      {cards.length === 0 ? (
        <Empty>لا توجد بطاقات بعد.</Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {cards.map((g) => (
            <li key={g.id} className="rounded-3xl border border-cocoa/10 bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-mono text-lg font-semibold tracking-widest text-cocoa" dir="ltr">
                  {g.code}
                </p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[g.status][1]}`}>{STATUS[g.status][0]}</span>
              </div>
              <p className="mt-2 text-sm text-cocoa">
                الرصيد {shekel(g.balance)} من {shekel(g.value)} <span className="text-taupe">(دُفع {shekel(g.paid)})</span>
              </p>
              <p className="mt-1 text-xs text-taupe">
                {when(g.createdAt)}
                {g.expiresAt ? ` · حتى ${day(g.expiresAt)}` : ""}
                {g.buyer ? (
                  <>
                    {" · "}
                    {g.buyerId ? (
                      <Link href={`/admin/customers/${g.buyerId}`} className="underline">
                        {g.buyer}
                      </Link>
                    ) : (
                      g.buyer
                    )}
                  </>
                ) : (
                  " · إصدار يدوي"
                )}
                {g.orderNumber ? (
                  <>
                    {" · "}
                    <Link href={`/admin/orders/${g.orderNumber}`} className="underline">
                      طلب #{g.orderNumber}
                    </Link>
                  </>
                ) : null}
              </p>
              {g.uses.length ? (
                <ul className="mt-3 space-y-1 border-t border-cocoa/10 pt-2 text-xs text-taupe">
                  {g.uses.map((u, i) => (
                    <li key={i}>
                      {u.amount < 0 ? "استُعملت" : "أُعيدت"} {shekel(Math.abs(u.amount))}
                      {u.orderNumber ? ` في طلب #${u.orderNumber}` : ""} · {when(u.at)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 border-t border-cocoa/10 pt-1">
                <ActionButton action={setGiftCardDisabled.bind(null, g.id, g.status !== "disabled")} confirm={g.status === "disabled" ? undefined : "إيقاف البطاقة؟"}>
                  {g.status === "disabled" ? "إعادة تفعيل" : "إيقاف"}
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
