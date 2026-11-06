import Link from "next/link";
import { OrderList } from "@/components/admin/order-list";
import { SalesChart } from "@/components/admin/sales-chart";
import { Card, Empty, PageHeader } from "@/components/admin/ui";
import { adminOrders, getDashboard } from "@/lib/admin";
import { day, shekel } from "@/lib/admin-format";
import { dailySales, salesPeriods, stockAlerts } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";

export default async function AdminHome() {
  const staff = await staffUser();
  if (!staff) return null;
  const can = (p: Parameters<typeof staff.permissions.includes>[0]) => staff.permissions.includes(p);
  const [s, latest, periods, chart, stock] = await Promise.all([
    getDashboard(),
    can("orders") ? adminOrders({ filter: "all", limit: 6 }) : Promise.resolve([]),
    can("reports") ? salesPeriods() : Promise.resolve(null),
    can("reports") ? dailySales(30) : Promise.resolve(null),
    can("products") ? stockAlerts() : Promise.resolve(null),
  ]);

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
          can("products") ? (
            <div className="flex gap-2">
              <Link href="/admin/products/new" className="btn btn-ink min-h-11 px-5 text-sm">
                + منتج جديد
              </Link>
              {can("marketing") ? (
                <Link href="/admin/coupons/new" className="btn btn-ghost-dark min-h-11 px-5 text-sm">
                  + كوبون
                </Link>
              ) : null}
            </div>
          ) : null
        }
      />

      {can("orders") ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {attention.map((a) => (
            <Link key={a.label} href={a.href} className={`group rounded-3xl p-5 transition-transform duration-200 hover:-translate-y-0.5 ${a.strong && a.value > 0 ? "bg-ink text-ivory" : "border border-cocoa/10 bg-ivory text-cocoa"}`}>
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
      ) : null}

      {periods ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "مبيعات اليوم", value: shekel(periods.today.sales), sub: `${periods.today.orders} طلب` },
              { label: "هذا الأسبوع", value: shekel(periods.week.sales), sub: `${periods.week.orders} طلب` },
              { label: "هذا الشهر", value: shekel(periods.month.sales), sub: `${periods.month.orders} طلب · متوسط ${shekel(periods.month.avg)}` },
              { label: "الزبائن", value: String(periods.customers), sub: `${periods.newCustomersMonth} جديدة هذا الشهر` },
            ].map((m) => (
              <div key={m.label} className="rounded-3xl border border-cocoa/10 bg-ivory p-5">
                <dt className="text-xs text-taupe">{m.label}</dt>
                <dd className="font-display mt-2 text-3xl text-cocoa">{m.value}</dd>
                <dd className="mt-1 text-xs text-taupe">{m.sub}</dd>
              </div>
            ))}
          </dl>
          {chart ? (
            <Card title="المبيعات اليومية (آخر 30 يومًا)" className="mt-3" action={<Link href="/admin/reports" className="text-sm text-gold-deep hover:underline">التقرير الكامل</Link>}>
              <SalesChart data={chart} />
            </Card>
          ) : null}
        </>
      ) : null}

      {stock && (stock.out.length || stock.low.length) ? (
        <Card title="تنبيهات المخزون" className="mt-3" action={<Link href="/admin/inventory" className="text-sm text-gold-deep hover:underline">المخزون</Link>}>
          <ul className="flex flex-wrap gap-2">
            {stock.out.map((a) => (
              <li key={`${a.productId}${a.variant}`} className="rounded-full bg-rosewood/10 px-3 py-1.5 text-sm text-rosewood">
                نفد: {a.name}
                {a.variant ? ` · ${a.variant}` : ""}
              </li>
            ))}
            {stock.low.map((a) => (
              <li key={`${a.productId}${a.variant}`} className="rounded-full bg-gold/20 px-3 py-1.5 text-sm text-gold-deep">
                {a.name}
                {a.variant ? ` · ${a.variant}` : ""}: بقي {a.stock}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {can("orders") ? (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-naskh text-2xl text-cocoa">آخر الطلبات</h2>
            <Link href="/admin/orders?status=all" className="min-h-11 content-center text-sm text-gold-deep hover:underline">
              كل الطلبات
            </Link>
          </div>
          {latest.length > 0 ? <OrderList orders={latest} /> : <Empty>لا توجد طلبات بعد. ستظهر هنا فور وصول أول طلب.</Empty>}
        </section>
      ) : null}
    </>
  );
}
