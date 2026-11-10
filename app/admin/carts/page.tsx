import type { Metadata } from "next";
import Link from "next/link";
import { RemindCartForm } from "@/components/admin/marketing-forms";
import { Empty, NoAccess, PageHeader } from "@/components/admin/ui";
import { shekel, when } from "@/lib/admin-format";
import { abandonedCarts } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export const metadata: Metadata = { title: "السلات المتروكة" };

export default async function Carts() {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const [carts, s] = await Promise.all([abandonedCarts(), getSettings()]);
  return (
    <>
      <PageHeader title="السلات المتروكة" subtitle={s.abandonedCart.enabled ? `تذكير تلقائي بعد ${s.abandonedCart.hours} ساعات لمن وافقت على رسائل العروض (يُرسل مع المهمة اليومية).` : "التذكير التلقائي متوقف من الإعدادات."} />
      {carts.length === 0 ? (
        <Empty>لا توجد سلات متروكة الآن. تظهر هنا سلات الزبونات المسجّلات اللواتي لم يكملن الطلب.</Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {carts.map((c) => (
            <li key={c.id} className="rounded-3xl border border-cocoa/10 bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/admin/customers/${c.customerId}`} className="font-medium text-cocoa hover:underline">
                    {c.name || c.phone}
                  </Link>
                  <p className="text-xs text-taupe">
                    آخر تعديل {when(c.updatedAt)}
                    {c.remindedAt ? ` · ذُكّرت ${when(c.remindedAt)}` : ""}
                    {c.coupon ? ` · كوبون ${c.coupon}` : ""}
                  </p>
                </div>
                <span className="font-semibold text-cocoa">{shekel(c.value)}</span>
              </div>
              <ul className="mt-2 text-sm text-taupe">
                {c.items.map((i, k) => (
                  <li key={k}>
                    {i.name} × {i.qty}
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-cocoa/10 pt-3">{c.consent ? <RemindCartForm cartId={c.id} /> : <p className="text-xs text-taupe">لم توافق على رسائل العروض.</p>}</div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
