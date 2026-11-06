import type { Metadata } from "next";
import Link from "next/link";
import { OrderList } from "@/components/admin/order-list";
import { Empty, field, PageHeader, STATUS_LABEL } from "@/components/admin/ui";
import { adminOrders, orderCounts, parseOrderFilter, type OrderFilter } from "@/lib/admin";
import { adminUser } from "@/lib/auth";
import { ACTIVE_STATUSES, ORDER_STATUSES } from "@/lib/orders";

export const metadata: Metadata = { title: "الطلبات" };

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  if (!(await adminUser())) return null;
  const sp = await searchParams;
  const filter = parseOrderFilter(sp.status);
  const q = typeof sp.q === "string" ? sp.q : "";
  const [orders, counts] = await Promise.all([adminOrders({ filter, q }), orderCounts()]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const chips: { id: OrderFilter; label: string; count: number }[] = [
    { id: "active", label: "المفتوحة", count: ACTIVE_STATUSES.reduce((a, s) => a + counts[s], 0) },
    ...ORDER_STATUSES.map((s) => ({ id: s, label: STATUS_LABEL[s], count: counts[s] })),
    { id: "all", label: "الكل", count: total },
  ];
  const link = (id: OrderFilter) => `/admin/orders?status=${id}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title="الطلبات" subtitle="الطلبات المفتوحة: بانتظار الدفع، الجديدة، قيد التجهيز، والتي تم شحنها." />

      <form action="/admin/orders" className="mb-5 flex gap-2" role="search">
        <input type="hidden" name="status" value={filter} />
        <label htmlFor="order-q" className="sr-only">
          بحث
        </label>
        <input id="order-q" name="q" defaultValue={q} placeholder="رقم الطلب، الاسم، الهاتف، المدينة أو البريد" className={`${field} mt-0`} />
        <button type="submit" className="btn btn-ink min-h-12 shrink-0 px-6">
          بحث
        </button>
      </form>

      <div className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex gap-2" aria-label="تصفية حسب الحالة">
          {chips.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link
                href={link(c.id)}
                aria-current={filter === c.id ? "page" : undefined}
                className="flex min-h-11 items-center gap-2 rounded-full border border-cocoa/15 px-4 text-sm whitespace-nowrap text-cocoa transition-colors duration-150 hover:border-cocoa/40 aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-ivory"
              >
                {c.label}
                <span className="text-xs opacity-60">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {q ? (
        <p className="mb-4 text-sm text-taupe">
          نتائج البحث عن «{q}»: {orders.length} ·{" "}
          <Link href={`/admin/orders?status=${filter}`} className="text-gold-deep underline">
            مسح البحث
          </Link>
        </p>
      ) : null}

      {orders.length > 0 ? <OrderList orders={orders} /> : <Empty>{q ? "لا توجد طلبات مطابقة." : "لا توجد طلبات في هذه الحالة."}</Empty>}
      {orders.length === 200 ? <p className="mt-3 text-xs text-taupe">تظهر آخر 200 طلب فقط؛ استعملوا البحث للوصول لطلب أقدم.</p> : null}
    </>
  );
}
