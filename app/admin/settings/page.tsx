import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/ui";
import { adminUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export const metadata: Metadata = { title: "التوصيل والنقاط" };

export default async function AdminSettings() {
  if (!(await adminUser())) return null;
  const s = await getSettings();
  return (
    <>
      <PageHeader title="التوصيل والنقاط" subtitle="تُطبَّق التغييرات على الطلبات الجديدة فقط؛ الطلبات السابقة تحتفظ بأسعارها." />
      <SettingsForm value={{ shippingFee: s.shippingFee, freeShippingThreshold: s.freeShippingThreshold, firstOrderDiscountPct: s.firstOrderDiscountPct, pointsEarnPct: s.pointsEarnPct, pointValue: s.pointValue }} />
    </>
  );
}
