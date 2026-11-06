import Link from "next/link";
import { OrderList } from "@/components/admin/order-list";
import { Empty, PageHeader } from "@/components/admin/ui";
import { adminOrders, getDashboard } from "@/lib/admin";
import { day, shekel } from "@/lib/admin-format";
import { adminUser } from "@/lib/auth";

export default async function AdminHome() {
  if (!(await adminUser())) return null;
  const [s, latest] = await Promise.all([getDashboard(), adminOrders({ filter: "all", limit: 8 })]);

  const attention = [
    { label: "بحاجة لتجهيز", hint: "طلبات جديدة وقيد التجهيز", value: s.toPrepare, href: "/admin/orders", strong: true },
    { label: "بانتظار الدفع", hint: "بطاقة أو Bit لم يكتمل دفعها", value: s.awaitingPayment, href: "/admin/orders?status=awaiting_payment" },
    { label: "في الطريق", hint: "تم شحنها ولم تصل بعد", value: s.onTheWay, href: "/admin/orders?status=shipped" },
  ];

  return (
    <>
      <PageHeader
        title="نظرة عامة"
        subtitle={day(new Date())}
        action={
          <div className="flex gap-2">
            <Link href="/admin/products/new" className="btn btn-ink min-h-11 px-5 text-sm">
              + منتج جديد
            </Link>
            <Link href="/admin/coupons/new" className="btn btn-ghost-dark min-h-11 px-5 text-sm">
              + كوبون
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {attention.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`group rounded-3xl p-5 transition-transform duration-200 hover:-translate-y-0.5 ${a.strong && a.value > 0 ? "bg-ink text-ivory" : "border border-cocoa/10 bg-ivory text-cocoa"}`}
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-semibold">{a.label}</span>
                <span className={`block text-xs ${a.strong && a.value > 0 ? "text-ivory/60" : "text-taupe"}`}>{a.hint}</span>
              </span>
              <span className={`font-display text-5xl leading-none ${a.strong && a.value > 0 ? "text-gold" : ""}`}>{a.value}</span>
            </span>
          </Link>
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "مبيعات اليوم", value: shekel(s.salesToday) },
          { label: "مبيعات هذا الشهر", value: shekel(s.salesMonth) },
          { label: "طلبات هذا الشهر", value: String(s.ordersMonth) },
          { label: "الحسابات المسجّلة", value: String(s.customers) },
        ].map((m) => (
          <div key={m.label} className="rounded-3xl border border-cocoa/10 bg-ivory p-5">
            <dt className="text-xs text-taupe">{m.label}</dt>
            <dd className="font-display mt-2 text-3xl text-cocoa">{m.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-taupe">المبيعات لا تشمل الطلبات الملغاة ولا طلبات البطاقة/Bit التي لم تُدفع.</p>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-naskh text-2xl text-cocoa">آخر الطلبات</h2>
          <Link href="/admin/orders?status=all" className="min-h-11 content-center text-sm text-gold-deep hover:underline">
            كل الطلبات
          </Link>
        </div>
        {latest.length > 0 ? <OrderList orders={latest} /> : <Empty>لا توجد طلبات بعد. ستظهر هنا فور وصول أول طلب.</Empty>}
      </section>
    </>
  );
}
