import type { Metadata } from "next";
import Link from "next/link";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import { staffUser } from "@/lib/auth";
import { getSettings } from "@/lib/orders";
import { displayPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function AdminSettings() {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("settings")) return <NoAccess />;
  const s = await getSettings();
  return (
    <>
      <PageHeader title="الإعدادات" subtitle="تُطبَّق التغييرات على الطلبات الجديدة فقط؛ الطلبات السابقة تحتفظ بأسعارها." />
      <SettingsForm value={s} ownerPhone={s.ownerPhone ? displayPhone(s.ownerPhone.startsWith("+") ? s.ownerPhone : `+972${s.ownerPhone.replace(/^0/, "")}`) : ""} whatsapp={s.whatsapp ?? ""} />
      <Card title="نسخ احتياطي وتصدير" className="mt-8 max-w-3xl">
        <p className="text-sm leading-7 text-taupe">قاعدة البيانات في Supabase تُنسخ احتياطيًا يوميًا في الباقة المدفوعة (Pro)، ويمكن الاسترجاع من لوحة Supabase. للاحتفاظ بنسخة عندك:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { k: "orders", l: "الطلبات" },
            { k: "customers", l: "الزبائن" },
            { k: "products", l: "المنتجات والمخزون" },
          ].map((x) => (
            <Link key={x.k} href={`/admin/export/${x.k}`} prefetch={false} className="btn btn-ghost-dark min-h-11 px-5 text-sm">
              تصدير {x.l} (CSV)
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
