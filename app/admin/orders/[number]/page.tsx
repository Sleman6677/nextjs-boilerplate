import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { InvoiceButton, TrackingForm } from "@/components/admin/order-extras";
import { carriers as listCarriers } from "@/lib/admin-reports";
import { payplusConfigured } from "@/lib/payplus";
import { Card, METHOD_LABEL, PageHeader, PAYMENT_LABEL, STATUS_LABEL, StatusPill } from "@/components/admin/ui";
import { shekel, when, whatsappTo } from "@/lib/admin-format";
import { staffUser } from "@/lib/auth";
import { NoAccess } from "@/components/admin/ui";
import { getDictionary } from "@/lib/i18n";
import { localeNames } from "@/lib/i18n/config";
import { getOrderByNumber } from "@/lib/orders";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  const { number } = await params;
  return { title: `طلب #${number}` };
}

const greeting = { ar: "مرحبًا {name}، بخصوص طلبكِ رقم #{number} من Serag Lashes: {status}.", he: "היי {name}, לגבי ההזמנה שלך #{number} מ-Serag Lashes: {status}.", en: "Hi {name}, about your Serag Lashes order #{number}: {status}." };

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[number]">) {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("orders")) return <NoAccess />;
  const { number } = await params;
  if (!/^\d{1,12}$/.test(number)) notFound();
  const [o, carrierList] = await Promise.all([getOrderByNumber(Number(number)), listCarriers()]);
  if (!o) notFound();

  const customerStatus = getDictionary(o.lang).order.statuses[o.status];
  const message = greeting[o.lang].replace("{name}", o.ship.name.split(" ")[0]).replace("{number}", String(o.number)).replace("{status}", customerStatus);
  const wa = whatsappTo(o.ship.phone, message);

  const rows: { label: string; value: string; strong?: boolean; muted?: boolean }[] = [
    { label: "المجموع الفرعي", value: shekel(o.subtotal) },
    ...(o.discountAmount > 0
      ? [{ label: o.discountKind === "coupon" ? `كوبون ${o.discountCode ?? ""}` : "خصم الطلب الأول", value: `−${shekel(o.discountAmount)}` }]
      : []),
    ...(o.pointsUsed > 0 ? [{ label: `نقاط مستعملة (${o.pointsUsed})`, value: `−${shekel(o.pointsValue)}` }] : []),
    ...(o.giftCardAmount > 0 ? [{ label: "بطاقة هدية", value: `−${shekel(o.giftCardAmount)}` }] : []),
    { label: "التوصيل", value: o.shippingFee > 0 ? shekel(o.shippingFee) : "مجاني" },
    { label: "الإجمالي", value: shekel(o.total), strong: true },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "الطلبات" }}
        title={`طلب #${o.number}`}
        subtitle={`${when(o.createdAt)} · لغة الزبون: ${localeNames[o.lang]}`}
        action={<StatusPill status={o.status} />}
      />

      {/* Phones: one column ordered by what the owner needs first; desktop: two columns. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1.35fr_1fr] lg:items-start">
        <div className="contents lg:block lg:space-y-5">
          <Card title="الإجراءات" className="max-lg:order-1">
            <OrderActions orderId={o.id} status={o.status} method={o.paymentMethod} paymentStatus={o.paymentStatus} pointsEarned={o.pointsAwarded ? 0 : o.pointsEarned} />
          </Card>

          <Card title={`المنتجات (${o.itemCount})`} className="max-lg:order-3">
            <ul className="divide-y divide-cocoa/10">
              {o.items.map((i, idx) => (
                <li key={idx} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-cocoa">
                    {i.name}
                    {i.variantName ? <span className="text-taupe"> · {i.variantName}</span> : null} <span className="text-taupe">× {i.quantity}</span>
                    {i.isGiftCard ? <span className="ms-2 rounded-full bg-gold/20 px-2 text-xs text-gold-deep">بطاقة هدية</span> : null}
                  </span>
                  <span className="text-sm text-taupe">{shekel(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-2 border-t border-cocoa/10 pt-4 text-sm">
              {rows.map((r) => (
                <div key={r.label} className={`flex justify-between gap-4 ${r.strong ? "border-t border-cocoa/10 pt-3 text-base font-semibold text-cocoa" : "text-taupe"}`}>
                  <dt>{r.label}</dt>
                  <dd dir="ltr">{r.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {o.needsShipping ? (
            <Card title="الشحن والتتبع" className="max-lg:order-3">
              <p className="mb-3 text-sm text-taupe">{o.zoneName ? `المنطقة: ${o.zoneName}` : ""}</p>
              <TrackingForm orderId={o.id} carriers={carrierList.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))} carrierId={null} number={o.trackingNumber} />
              {o.trackingUrl ? (
                <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-gold-deep underline">
                  فتح رابط التتبع
                </a>
              ) : null}
            </Card>
          ) : null}

          <Card title="سجلّ الطلب" className="max-lg:order-6">
            <ol className="relative space-y-4 border-s border-cocoa/15 ps-5">
              {o.events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -start-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-gold ring-4 ring-ivory" aria-hidden="true" />
                  <p className="text-sm font-medium text-cocoa">
                    {STATUS_LABEL[e.status as keyof typeof STATUS_LABEL] ?? e.status}
                    {e.note === "paid" ? " · تم الدفع" : ""}
                  </p>
                  <p className="text-xs text-taupe">
                    {when(e.createdAt)}
                    {e.actor ? ` · ${e.actor === "customer" ? "الزبونة" : e.actor === "system" ? "تلقائي" : e.actor === "payplus" ? "PayPlus" : e.actor}` : ""}
                  </p>
                  {e.note && e.note !== "paid" ? <p className="mt-1 rounded-xl bg-sand/50 px-3 py-2 text-sm text-cocoa">{e.note}</p> : null}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="contents lg:block lg:space-y-5">
          <Card title="الزبون والتوصيل" className="max-lg:order-2">
            <p className="text-lg font-medium text-cocoa">{o.ship.name}</p>
            <p className="mt-1 text-taupe">
              {o.ship.street ? `${o.ship.street}، ${o.ship.city}` : o.zoneName ?? "بدون توصيل"}
            </p>
            {o.ship.notes ? <p className="mt-3 rounded-xl bg-gold/15 px-3 py-2 text-sm text-cocoa">ملاحظة للمندوب: {o.ship.notes}</p> : null}
            {o.customerNote ? <p className="mt-3 rounded-xl bg-gold/15 px-3 py-2 text-sm text-cocoa">ملاحظة على الطلب: {o.customerNote}</p> : null}
            {o.source ? (
              <p className="mt-3 text-sm text-taupe">
                المصدر: <span dir="ltr">{o.source}</span>
                {o.campaign ? ` · ${o.campaign}` : ""}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`tel:${o.ship.phone.replace(/[^\d+]/g, "")}`} className="btn btn-ghost-dark min-h-11 px-4 text-sm" dir="ltr">
                {o.ship.phone}
              </a>
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-ink min-h-11 px-4 text-sm">
                  واتساب للزبون
                </a>
              ) : null}
            </div>
            <p className="mt-4 text-sm text-taupe">
              الحساب:{" "}
              <a href={`mailto:${o.userEmail}`} className="text-cocoa underline decoration-cocoa/30" dir="ltr">
                {o.userEmail}
              </a>
            </p>
          </Card>

          <Card title="الدفع" className="max-lg:order-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">الطريقة</dt>
                <dd className="text-cocoa">{METHOD_LABEL[o.paymentMethod]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">الحالة</dt>
                <dd className={o.paymentStatus === "paid" ? "font-semibold text-emerald-800" : "text-cocoa"}>{PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus}</dd>
              </div>
              {o.invoiceUrl ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-taupe">الفاتورة</dt>
                  <dd>
                    <a href={o.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-gold-deep underline" dir="ltr">
                      {o.invoiceNumber ?? "PDF"}
                    </a>
                  </dd>
                </div>
              ) : o.paymentStatus === "paid" && payplusConfigured() ? (
                <div className="pt-2">
                  <InvoiceButton orderId={o.id} />
                </div>
              ) : null}
              {o.paymentMethod === "bit" && o.paymentStatus !== "paid" ? (
                <p className="rounded-xl bg-sand/50 px-3 py-2 text-xs text-taupe">إذا وصل تحويل Bit يدويًا، اضغطوا «تأكيد استلام الدفع».</p>
              ) : null}
            </dl>
          </Card>

          <Card title="النقاط" className="max-lg:order-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">نقاط مستعملة في الطلب</dt>
                <dd className="text-cocoa">{o.pointsUsed}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">نقاط يكسبها الطلب</dt>
                <dd className="text-cocoa">
                  {o.pointsEarned} {o.pointsEarned > 0 ? <span className="text-xs text-taupe">({o.pointsAwarded ? "أُضيفت" : "تُضاف عند التوصيل"})</span> : null}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
