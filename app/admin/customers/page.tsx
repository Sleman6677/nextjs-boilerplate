import type { Metadata } from "next";
import Link from "next/link";
import { PointsForm } from "@/components/admin/points-form";
import { Empty, field, PageHeader } from "@/components/admin/ui";
import { adminCustomers } from "@/lib/admin";
import { day, shekel, whatsappTo } from "@/lib/admin-format";
import { adminUser } from "@/lib/auth";

export const metadata: Metadata = { title: "الزبائن" };

export default async function AdminCustomers({ searchParams }: PageProps<"/admin/customers">) {
  if (!(await adminUser())) return null;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const customers = await adminCustomers(q);

  return (
    <>
      <PageHeader title="الزبائن" subtitle="كل من سجّل الدخول للموقع، مع عدد الطلبات ورصيد النقاط." />
      <form action="/admin/customers" className="mb-6 flex gap-2" role="search">
        <label htmlFor="cust-q" className="sr-only">
          بحث
        </label>
        <input id="cust-q" name="q" defaultValue={q} placeholder="الاسم، البريد أو الهاتف" className={`${field} mt-0`} />
        <button type="submit" className="btn btn-ink min-h-12 shrink-0 px-6">
          بحث
        </button>
      </form>

      {customers.length === 0 ? (
        <Empty>{q ? "لا توجد نتائج." : "لا توجد حسابات بعد."}</Empty>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {customers.map((c) => {
            const wa = c.phone ? whatsappTo(c.phone) : null;
            return (
              <li key={c.id} className="rounded-3xl border border-cocoa/10 bg-ivory p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-cocoa">{c.name || "بدون اسم"}</p>
                    <p className="truncate text-sm text-taupe" dir="ltr">
                      {c.email}
                    </p>
                    {c.phone ? (
                      <p className="text-sm text-taupe">
                        {wa ? (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="underline decoration-cocoa/30" dir="ltr">
                            {c.phone}
                          </a>
                        ) : (
                          <span dir="ltr">{c.phone}</span>
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-display text-3xl leading-none text-gold-deep">{c.points}</p>
                    <p className="text-xs text-taupe">نقطة</p>
                  </div>
                </div>
                <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-taupe">
                  <Link href={`/admin/orders?status=all&q=${encodeURIComponent(c.email)}`} className="text-gold-deep underline">
                    {c.orders} طلب
                  </Link>
                  <span>مجموع المشتريات {shekel(c.spent)}</span>
                  <span>منذ {day(c.joinedAt)}</span>
                </p>
                <details className="mt-2">
                  <summary className="min-h-11 cursor-pointer content-center text-sm text-cocoa">تعديل النقاط</summary>
                  <PointsForm userId={c.id} label="إضافة أو خصم نقاط" />
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
