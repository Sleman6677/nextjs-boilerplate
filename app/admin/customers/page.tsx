import type { Metadata } from "next";
import Link from "next/link";
import { Empty, field, NoAccess, PageHeader } from "@/components/admin/ui";
import { adminCustomers } from "@/lib/admin";
import { day, shekel } from "@/lib/admin-format";
import { staffUser } from "@/lib/auth";
import { displayPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "الزبائن" };

export default async function AdminCustomers({ searchParams }: PageProps<"/admin/customers">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("customers")) return <NoAccess />;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const customers = await adminCustomers(q);
  return (
    <>
      <PageHeader title="الزبائن" subtitle="العضوية تُنشأ تلقائيًا مع أول طلب أو عند الدخول برقم الهاتف." action={<Link href="/admin/export/customers" prefetch={false} className="btn btn-ghost-dark min-h-11 px-5 text-sm">تصدير CSV</Link>} />
      <form action="/admin/customers" className="mb-6 flex gap-2" role="search">
        <label htmlFor="cust-q" className="sr-only">
          بحث
        </label>
        <input id="cust-q" name="q" defaultValue={q} placeholder="الاسم أو رقم الهاتف" className={`${field} mt-0`} />
        <button type="submit" className="btn btn-ink min-h-12 shrink-0 px-6">
          بحث
        </button>
      </form>
      {customers.length === 0 ? (
        <Empty>{q ? "لا توجد نتائج." : "لا توجد حسابات بعد."}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-cocoa/10 bg-ivory">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-xs text-taupe">
              <tr className="border-b border-cocoa/10">
                <th className="p-4 text-start font-medium">الزبونة</th>
                <th className="p-4 text-start font-medium">الطلبات</th>
                <th className="p-4 text-start font-medium">المشتريات</th>
                <th className="p-4 text-start font-medium">النقاط</th>
                <th className="p-4 text-start font-medium">آخر طلب</th>
                <th className="p-4 text-start font-medium">عيد الميلاد</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-cocoa/5 last:border-0 hover:bg-sand/30">
                  <td className="p-4">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium text-cocoa hover:underline">
                      {c.name || "بدون اسم"}
                    </Link>
                    <span className="block text-xs text-taupe" dir="ltr">
                      {c.phone.startsWith("+972") ? displayPhone(c.phone) : c.phone || c.email}
                    </span>
                  </td>
                  <td className="p-4">{c.orders}</td>
                  <td className="p-4">{shekel(c.spent)}</td>
                  <td className="p-4 text-gold-deep">{c.points}</td>
                  <td className="p-4 text-taupe">{c.lastOrder ? day(c.lastOrder) : "—"}</td>
                  <td className="p-4 text-taupe">{c.birthday ? day(`${c.birthday}T12:00:00`) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
