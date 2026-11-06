import type { Metadata } from "next";
import { deleteStaff } from "@/app/actions/admin-settings";
import { ActionButton } from "@/components/admin/action-button";
import { StaffForm } from "@/components/admin/settings-forms";
import { Card, NoAccess, PageHeader } from "@/components/admin/ui";
import { when } from "@/lib/admin-format";
import { auditLog, staffList } from "@/lib/admin-reports";
import { staffUser } from "@/lib/auth";

export const metadata: Metadata = { title: "الطاقم والسجل" };

const ENTITY: Record<string, string> = { order: "طلب", product: "منتج", category: "مجموعة", coupon: "كوبون", offer: "عرض", gift_card: "بطاقة هدية", customer: "زبونة", settings: "الإعدادات", zone: "منطقة شحن", carrier: "شركة شحن", staff: "طاقم", template: "نص رسالة", messages: "رسائل", cart: "سلة", review: "تقييم" };
const ACTION: Record<string, string> = { create: "أضاف", update: "عدّل", delete: "حذف", stock: "عدّل المخزون", show: "أظهر", hide: "أخفى", enable: "فعّل", disable: "أوقف", points: "عدّل النقاط", tracking: "أضاف رقم تتبع", invoice: "أصدر فاتورة", personal_coupon: "أنشأ كوبونًا خاصًا", broadcast: "أرسل رسالة تسويقية", remind: "أرسل تذكيرًا", issue: "أصدر", review_approved: "نشر", review_hidden: "أخفى", review_delete: "حذف" };

export default async function Staff() {
  const staff = await staffUser();
  if (!staff) return null;
  if (!staff.permissions.includes("staff")) return <NoAccess />;
  const [list, log] = await Promise.all([staffList(), auditLog(150)]);
  return (
    <>
      <PageHeader title="الطاقم والسجل" subtitle="حسابات الموظفين وصلاحياتهم. صاحب المتجر (من ADMIN_PHONES / ADMIN_EMAILS) لديه كل الصلاحيات دائمًا." />
      <div className="space-y-4">
        {list.map((s) => (
          <Card key={s.id} title={`${s.name}${s.active ? "" : " · موقوف"}`} action={<ActionButton action={deleteStaff.bind(null, s.id)} confirm="حذف الحساب؟" className="min-h-11 text-sm text-rosewood">حذف</ActionButton>}>
            <StaffForm value={s} canGrantStaff={staff.owner} />
          </Card>
        ))}
        <Card title="موظف/ة جديد/ة">
          <StaffForm canGrantStaff={staff.owner} />
        </Card>
      </div>
      <h2 className="font-naskh mt-12 mb-4 text-2xl text-cocoa">سجل التعديلات</h2>
      <ul className="divide-y divide-cocoa/10 rounded-3xl border border-cocoa/10 bg-ivory text-sm">
        {log.map((a) => (
          <li key={a.id} className="flex flex-wrap justify-between gap-2 p-4">
            <span className="text-cocoa">
              <strong>{a.actor}</strong> {ACTION[a.action] ?? a.action} {ENTITY[a.entity] ?? a.entity}
              {a.details && typeof a.details.name === "string" ? ` «${a.details.name}»` : ""}
              {a.details && "from" in a.details ? ` (${String(a.details.from)} ← ${String(a.details.to)})` : ""}
            </span>
            <span className="text-xs text-taupe">{when(a.at)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
