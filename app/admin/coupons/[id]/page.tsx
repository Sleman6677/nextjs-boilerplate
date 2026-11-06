import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CouponForm } from "@/components/admin/coupon-form";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import { adminCategories, adminCoupon, adminProducts } from "@/lib/admin";
import { dateInput, shekel, when } from "@/lib/admin-format";
import { couponStats } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "كوبون" };

export default async function EditCoupon({ params }: PageProps<"/admin/coupons/[id]">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("marketing")) return <NoAccess />;
  const { id } = await params;
  const [c, stats, products, categories] = await Promise.all([adminCoupon(id), couponStats(id), adminProducts(), adminCategories()]);
  if (!c) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/coupons", label: "الكوبونات" }} title={c.code} subtitle={c.name || undefined} />
      <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "عدد الزبائن", value: String(stats.users) },
          { label: "مرات الاستعمال", value: String(stats.uses) },
          { label: "المبيعات بالكود", value: shekel(Math.round(stats.sales)) },
          { label: "إجمالي الخصومات", value: shekel(Math.round(stats.discounts)) },
        ].map((m) => (
          <div key={m.label} className="rounded-3xl border border-cocoa/10 bg-ivory p-5">
            <dt className="text-xs text-taupe">{m.label}</dt>
            <dd className="font-display mt-2 text-3xl text-cocoa">{m.value}</dd>
          </div>
        ))}
      </dl>
      {stats.redemptions.length ? (
        <Card title="من استعمل الكود" className="mb-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-xs text-taupe">
                <tr>
                  <th className="pb-2 text-start font-medium">الزبونة</th>
                  <th className="pb-2 text-start font-medium">الطلب</th>
                  <th className="pb-2 text-start font-medium">الإجمالي</th>
                  <th className="pb-2 text-start font-medium">الخصم</th>
                  <th className="pb-2 text-start font-medium">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody>
                {stats.redemptions.map((r) => (
                  <tr key={`${r.orderNumber}`} className={`border-t border-cocoa/5 ${r.status === "cancelled" ? "text-taupe line-through" : ""}`}>
                    <td className="py-2">
                      <Link href={`/admin/customers/${r.customerId}`} className="hover:underline">
                        {r.name || r.phone}
                      </Link>
                    </td>
                    <td className="py-2">
                      <Link href={`/admin/orders/${r.orderNumber}`} className="hover:underline">
                        #{r.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2">{shekel(r.total)}</td>
                    <td className="py-2">{shekel(r.discount)}</td>
                    <td className="py-2">{when(r.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
      <CouponForm
        products={products.filter((p) => p.kind === "standard").map((p) => ({ id: p.id, name: p.name.ar || p.name.en }))}
        categories={categories.map((x) => ({ id: x.id, name: x.name.ar || x.name.en }))}
        value={{
          id: c.id,
          code: c.code,
          kind: c.kind,
          value: c.value,
          minSubtotal: c.minSubtotal,
          maxUses: c.maxUses ?? "",
          startsAt: dateInput(c.startsAt),
          endsAt: dateInput(c.endsAt),
          oncePerCustomer: c.oncePerCustomer,
          active: c.active,
          name: c.name,
          source: c.source,
          excludeSale: c.excludeSale,
          scope: c.scope,
          productIds: c.productIds,
          categoryIds: c.categoryIds,
        }}
      />
    </>
  );
}
