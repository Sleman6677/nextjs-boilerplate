import type { Metadata } from "next";
import Link from "next/link";
import { CouponRowActions } from "@/components/admin/coupon-row-actions";
import { Empty, NoAccess, Notice, PageHeader } from "@/components/admin/ui";
import { adminCoupons, type AdminCoupon } from "@/lib/admin";
import { day, shekel } from "@/lib/admin-format";
import { staffUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export const metadata: Metadata = { title: "الكوبونات" };

function state(c: AdminCoupon): { label: string; tone: string } {
  const now = Date.now();
  if (!c.active) return { label: "موقوف", tone: "bg-ivory/10 text-taupe" };
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return { label: "منتهي", tone: "bg-rosewood/10 text-rosewood" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "لم يبدأ", tone: "bg-gold/20 text-gold-deep" };
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return { label: "نفد", tone: "bg-rosewood/10 text-rosewood" };
  return { label: "فعّال", tone: "bg-emerald-700/10 text-emerald-800" };
}

export default async function AdminCoupons({ searchParams }: PageProps<"/admin/coupons">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const sp = await searchParams;
  const [coupons, settings] = await Promise.all([adminCoupons(), getSettings()]);

  return (
    <>
      <PageHeader
        title="الكوبونات"
        subtitle={
          <>
            خصم واحد في كل طلب. خصم الطلب الأول الحالي: {settings.firstOrderDiscountPct > 0 ? `${settings.firstOrderDiscountPct}٪` : "متوقف"} ·{" "}
            <Link href="/admin/settings" className="text-gold-deep underline">
              تعديل
            </Link>
          </>
        }
        action={
          <Link href="/admin/coupons/new" className="btn btn-ink min-h-11 px-5 text-sm">
            + كوبون جديد
          </Link>
        }
      />
      {sp.saved ? <Notice>تم حفظ الكوبون.</Notice> : null}

      {coupons.length === 0 ? (
        <Empty>لا توجد كوبونات بعد.</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {coupons.map((c) => {
            const s = state(c);
            const rules = [
              c.minSubtotal > 0 ? `من ${shekel(c.minSubtotal)}` : null,
              c.endsAt ? `حتى ${day(c.endsAt)}` : null,
              c.startsAt ? `من تاريخ ${day(c.startsAt)}` : null,
              c.oncePerCustomer ? "مرة لكل حساب" : null,
            ].filter(Boolean);
            return (
              <li key={c.id} className={`rounded-3xl border border-cocoa/10 bg-surface p-5 ${c.active ? "" : "opacity-70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/coupons/${c.id}`} className="font-display text-2xl font-semibold tracking-widest text-cocoa hover:text-gold-deep" dir="ltr">
                      {c.code}
                    </Link>
                    <p className="mt-1 text-lg text-cocoa">{c.kind === "percent" ? `${c.value}٪ خصم` : `${shekel(c.value)} خصم`}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                </div>
                {rules.length ? <p className="mt-2 text-xs text-taupe">{rules.join(" · ")}</p> : null}
                <p className="mt-3 text-sm text-taupe">
                  استُعمل {c.usedCount}
                  {c.maxUses !== null ? ` من ${c.maxUses}` : ""} مرة
                </p>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-cocoa/10 pt-2">
                  <CouponRowActions id={c.id} code={c.code} active={c.active} used={c.usedCount > 0} />
                  <Link href={`/admin/coupons/${c.id}`} className="min-h-11 content-center text-sm text-gold-deep hover:underline">
                    تعديل
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
