import type { Metadata } from "next";
import { deleteCarrier, deleteZone } from "@/app/actions/admin-settings";
import { ActionButton } from "@/components/admin/action-button";
import { CarrierForm, ZoneForm } from "@/components/admin/settings-forms";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import { shekel } from "@/lib/admin-format";
import { carriers, zones } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export const metadata: Metadata = { title: "الشحن" };

export default async function Shipping() {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("settings")) return <NoAccess />;
  const [z, c, s] = await Promise.all([zones(), carriers(), getSettings()]);
  return (
    <>
      <PageHeader title="الشحن" subtitle={`مناطق التوصيل وأسعارها. حد التوصيل المجاني العام: ${s.freeShippingThreshold !== null ? shekel(s.freeShippingThreshold) : "متوقف"} (من الإعدادات)؛ يمكن تحديد حد مختلف لكل منطقة.`} />
      <div className="space-y-4">
        {z.map((zone) => (
          <Card key={zone.id} title={`${zone.name.ar} · ${zone.price === 0 ? "مجاني" : shekel(zone.price)}${zone.active ? "" : " · مخفية"}`} action={<ActionButton action={deleteZone.bind(null, zone.id)} confirm="حذف المنطقة؟" className="min-h-11 text-sm text-rosewood">حذف</ActionButton>}>
            <ZoneForm value={zone} />
          </Card>
        ))}
        <details className="rounded-3xl border border-dashed border-cocoa/25 p-5">
          <summary className="min-h-11 cursor-pointer content-center font-semibold text-cocoa">+ منطقة جديدة</summary>
          <div className="mt-4">
            <ZoneForm />
          </div>
        </details>
      </div>
      <h2 className="font-naskh mt-12 mb-4 text-2xl text-cocoa">شركات الشحن ورقم التتبع</h2>
      <p className="mb-4 text-sm text-taupe">عند إضافة رقم تتبع لطلب، يظهر للزبونة زر «تتبّعي الشحنة» ويُرسل لها في رسالة الشحن.</p>
      <div className="space-y-4">
        {c.map((x) => (
          <Card key={x.id} title={x.name} action={<ActionButton action={deleteCarrier.bind(null, x.id)} confirm="حذف؟" className="min-h-11 text-sm text-rosewood">حذف</ActionButton>}>
            <CarrierForm value={x} />
          </Card>
        ))}
        <Card title="شركة شحن جديدة">
          <CarrierForm />
        </Card>
      </div>
    </>
  );
}
