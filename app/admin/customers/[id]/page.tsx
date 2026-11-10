import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PersonalCouponForm } from "@/components/admin/personal-coupon-form";
import { PointsForm } from "@/components/admin/points-form";
import { Card, NoAccess, PageHeader, STATUS_LABEL } from "@/components/admin/ui";
import { day, shekel, when, whatsappTo } from "@/lib/admin-format";
import { customerDetail } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";
import type { OrderStatus } from "@/lib/order-status";
import { displayPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "زبونة" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("customers")) return <NoAccess />;
  const { id } = await params;
  const c = await customerDetail(id);
  if (!c) notFound();
  const wa = c.phone ? whatsappTo(c.phone) : null;
  return (
    <>
      <PageHeader back={{ href: "/admin/customers", label: "الزبائن" }} title={c.name || "بدون اسم"} subtitle={`عضوة منذ ${day(c.joinedAt)}`} />
      <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "الطلبات", value: String(c.orders.length) },
          { label: "إجمالي المشتريات", value: shekel(c.spent) },
          { label: "النقاط", value: String(c.points) },
          { label: "آخر طلب", value: c.lastOrder ? day(c.lastOrder) : "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-3xl border border-cocoa/10 bg-surface p-5">
            <dt className="text-xs text-taupe">{m.label}</dt>
            <dd className="font-display mt-2 text-2xl text-cocoa">{m.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card title="الطلبات">
            {c.orders.length === 0 ? (
              <p className="text-sm text-taupe">لا طلبات.</p>
            ) : (
              <ul className="divide-y divide-cocoa/10 text-sm">
                {c.orders.map((o) => (
                  <li key={o.number}>
                    <Link href={`/admin/orders/${o.number}`} className="flex justify-between gap-3 py-2.5 hover:bg-sand/30">
                      <span>
                        #{o.number} · {when(o.createdAt)}
                      </span>
                      <span className="text-taupe">
                        {STATUS_LABEL[o.status as OrderStatus] ?? o.status} · {shekel(o.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="المنتجات التي اشترتها">
            {c.products.length === 0 ? <p className="text-sm text-taupe">—</p> : <p className="text-sm leading-7 text-cocoa">{c.products.map((p) => `${p.name} (${p.units})`).join("، ")}</p>}
          </Card>
          <Card title="الكوبونات المستعملة">
            {c.coupons.length === 0 ? (
              <p className="text-sm text-taupe">—</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {c.coupons.map((x, i) => (
                  <li key={i}>
                    <span dir="ltr" className="font-mono">
                      {x.code}
                    </span>{" "}
                    · خصم {shekel(x.discount)} · طلب #{x.orderNumber} · {when(x.at)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="بطاقات الهدية">
            {c.giftCards.length === 0 ? (
              <p className="text-sm text-taupe">—</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {c.giftCards.map((g, i) => (
                  <li key={i}>
                    {g.role === "bought" ? "اشترت" : "استعملت"}{" "}
                    <span dir="ltr" className="font-mono">
                      {g.code}
                    </span>{" "}
                    · الرصيد {shekel(g.balance)} من {shekel(g.value)}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="البيانات">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-taupe">الهاتف</dt>
                <dd dir="ltr">{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="underline">{displayPhone(c.phone)}</a> : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-taupe">البريد</dt>
                <dd dir="ltr">{c.email || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-taupe">تاريخ الميلاد</dt>
                <dd>{c.birthday ? day(`${c.birthday}T12:00:00`) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-taupe">رسائل العروض</dt>
                <dd>{c.consent ? "موافقة" : "غير موافقة"}</dd>
              </div>
            </dl>
          </Card>
          {staff.permissions.includes("customers") ? (
            <Card title="تعديل النقاط">
              <PointsForm userId={c.id} label="إضافة أو خصم نقاط" />
            </Card>
          ) : null}
          {staff.permissions.includes("marketing") ? (
            <Card title="كوبون خاص لهذه الزبونة">
              <PersonalCouponForm userId={c.id} consent={c.consent} />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
