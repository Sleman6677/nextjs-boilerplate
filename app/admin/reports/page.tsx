import type { Metadata } from "next";
import Link from "next/link";
import { SalesChart } from "@/components/admin/sales-chart";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import { shekel } from "@/lib/admin-format";
import { dailySales, productSales, salesPeriods, stockAlerts } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "المبيعات" };

export default async function Reports({ searchParams }: PageProps<"/admin/reports">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("reports")) return <NoAccess />;
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const [periods, chart, products, stock] = await Promise.all([salesPeriods(), dailySales(Math.min(days, 90)), productSales(days), stockAlerts()]);
  const best = products.filter((p) => p.units > 0).slice(0, 10);
  const worst = [...products].sort((a, b) => a.units - b.units || a.revenue - b.revenue).slice(0, 10);

  return (
    <>
      <PageHeader title="المبيعات" subtitle="لا تشمل الطلبات الملغاة ولا طلبات البطاقة/Bit التي لم تُدفع." />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[periods.today, periods.week, periods.month, periods.all].map((p) => (
          <div key={p.label} className="rounded-3xl border border-cocoa/10 bg-surface p-5">
            <dt className="text-xs text-taupe">{p.label}</dt>
            <dd className="font-display mt-2 text-3xl text-cocoa">{shekel(p.sales)}</dd>
            <dd className="mt-1 text-xs text-taupe">
              {p.orders} طلب · متوسط الطلب {shekel(p.avg)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-taupe">
        عدد الزبائن اللواتي طلبن: {periods.customers} · الخصومات والنقاط هذا الشهر: {shekel(periods.month.discounts)}
      </p>

      <div className="mt-6 mb-3 flex gap-2" role="group" aria-label="الفترة">
        {[7, 30, 90, 365].map((d) => (
          <Link key={d} href={`/admin/reports?days=${d}`} aria-current={d === days ? "page" : undefined} className="flex min-h-11 items-center rounded-full border border-cocoa/15 px-4 text-sm text-cocoa aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-ivory">
            {d === 365 ? "سنة" : `${d} يومًا`}
          </Link>
        ))}
      </div>
      <Card title={`المبيعات اليومية (آخر ${Math.min(days, 90)} يومًا)`}>
        <SalesChart data={chart} />
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="الأكثر مبيعًا">
          {best.length === 0 ? (
            <p className="text-sm text-taupe">لا مبيعات في هذه الفترة.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {best.map((p, i) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <Link href={`/admin/products/${p.id}`} className="text-cocoa hover:underline">
                    {i + 1}. {p.name}
                  </Link>
                  <span className="text-taupe">
                    {p.units} قطعة · {shekel(p.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="الأقل مبيعًا">
          <ol className="space-y-2 text-sm">
            {worst.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <Link href={`/admin/products/${p.id}`} className="text-cocoa hover:underline">
                  {p.name}
                </Link>
                <span className="text-taupe">
                  {p.units} قطعة{p.stock !== null ? ` · المخزون ${p.stock}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="قاربت على النفاد">
          {stock.low.length === 0 ? (
            <p className="text-sm text-taupe">لا يوجد.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stock.low.map((a) => (
                <li key={`${a.productId}${a.variant}`} className="flex justify-between">
                  <span>
                    {a.name}
                    {a.variant ? ` · ${a.variant}` : ""}
                  </span>
                  <span className="text-gold-deep">بقي {a.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="نفدت من المخزون">
          {stock.out.length === 0 ? (
            <p className="text-sm text-taupe">لا يوجد.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stock.out.map((a) => (
                <li key={`${a.productId}${a.variant}`} className="text-rosewood">
                  {a.name}
                  {a.variant ? ` · ${a.variant}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
