"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/admin";
import { saveCarrier, saveStaff, saveZone } from "@/app/actions/admin-settings";
import { FormResult, SubmitButton, Toggle } from "./form-bits";
import { field } from "./ui";

const initial: FormState = { ok: false, error: null };
const PERMS = [
  { id: "orders", label: "الطلبات" },
  { id: "products", label: "المنتجات والمخزون" },
  { id: "customers", label: "الزبائن" },
  { id: "marketing", label: "التسويق (عروض، كوبونات، رسائل)" },
  { id: "reports", label: "المبيعات والتقارير" },
  { id: "settings", label: "الشحن والإعدادات" },
  { id: "staff", label: "الطاقم" },
];

export function ZoneForm({ value }: { value?: { id: string; name: { ar: string; he: string; en: string }; price: number; freeThreshold: number | null; isPickup: boolean; active: boolean; sort: number } }) {
  const [state, action] = useActionState(saveZone, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_6rem_7rem] sm:items-end">
      {value ? <input type="hidden" name="id" value={value.id} /> : null}
      {(["ar", "he", "en"] as const).map((l) => (
        <label key={l} className="text-xs text-taupe">
          {l === "ar" ? "الاسم (عربي) *" : l === "he" ? "עברית" : "English"}
          <input name={`name_${l}`} dir={l === "en" ? "ltr" : "rtl"} defaultValue={value?.name[l] ?? ""} required={l === "ar"} className={field} />
        </label>
      ))}
      <label className="text-xs text-taupe">
        السعر ₪
        <input name="price" type="number" inputMode="decimal" min={0} step="0.01" required defaultValue={value?.price ?? 30} dir="ltr" className={`${field} text-right`} />
      </label>
      <label className="text-xs text-taupe">
        مجاني فوق ₪
        <input name="free_threshold" type="number" inputMode="decimal" min={0} defaultValue={value?.freeThreshold ?? ""} placeholder="العام" dir="ltr" className={`${field} text-right`} />
      </label>
      <div className="flex flex-wrap items-center gap-x-6 sm:col-span-5">
        <Toggle name="is_pickup" defaultChecked={value?.isPickup} label="استلام ذاتي (بدون عنوان)" />
        <Toggle name="active" defaultChecked={value?.active ?? true} label="ظاهرة" />
        <label className="flex items-center gap-2 text-xs text-taupe">
          الترتيب
          <input name="sort" type="number" step={1} defaultValue={value?.sort ?? 0} dir="ltr" className={`${field} mt-0 w-20 py-2 text-right`} />
        </label>
        <SubmitButton className="min-h-11 px-5 text-sm">{value ? "حفظ" : "إضافة منطقة"}</SubmitButton>
        <FormResult state={state} />
      </div>
    </form>
  );
}

export function CarrierForm({ value }: { value?: { id: string; name: string; trackingUrl: string; active: boolean } }) {
  const [state, action] = useActionState(saveCarrier, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
      {value ? <input type="hidden" name="id" value={value.id} /> : null}
      <label className="text-xs text-taupe">
        شركة الشحن
        <input name="name" defaultValue={value?.name ?? ""} required className={field} />
      </label>
      <label className="text-xs text-taupe">
        رابط التتبع (يحتوي {"{number}"})
        <input name="tracking_url" defaultValue={value?.trackingUrl ?? ""} placeholder="https://example.co.il/track?id={number}" dir="ltr" className={`${field} text-sm`} />
      </label>
      <div className="flex items-center gap-3">
        <Toggle name="active" defaultChecked={value?.active ?? true} label="فعّالة" />
        <SubmitButton className="min-h-11 px-5 text-sm">{value ? "حفظ" : "إضافة"}</SubmitButton>
      </div>
      <div className="sm:col-span-3">
        <FormResult state={state} />
      </div>
    </form>
  );
}

export function StaffForm({ value, canGrantStaff }: { value?: { id: string; name: string; email: string; phone: string; permissions: string[]; active: boolean }; canGrantStaff: boolean }) {
  const [state, action] = useActionState(saveStaff, initial);
  return (
    <form action={action} className="space-y-3">
      {value ? <input type="hidden" name="id" value={value.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-taupe">
          الاسم *
          <input name="name" defaultValue={value?.name ?? ""} required className={field} />
        </label>
        <label className="text-xs text-taupe">
          الهاتف (للدخول برمز SMS)
          <input name="phone" type="tel" inputMode="tel" defaultValue={value?.phone ? `0${value.phone.slice(4)}` : ""} dir="ltr" className={`${field} rtl:text-right`} />
        </label>
        <label className="text-xs text-taupe">
          أو البريد
          <input name="email" type="email" defaultValue={value?.email ?? ""} dir="ltr" className={`${field} rtl:text-right`} />
        </label>
      </div>
      <fieldset>
        <legend className="text-xs text-taupe">الصلاحيات</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PERMS.filter((p) => canGrantStaff || p.id !== "staff").map((p) => (
            <label key={p.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-cocoa/15 px-3 text-sm has-checked:border-ink has-checked:bg-ink has-checked:text-ivory">
              <input type="checkbox" name="permissions" value={p.id} defaultChecked={value?.permissions.includes(p.id)} className="sr-only" />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <Toggle name="active" defaultChecked={value?.active ?? true} label="الحساب فعّال" />
        <SubmitButton className="min-h-11 px-5 text-sm">{value ? "حفظ" : "إضافة موظف/ة"}</SubmitButton>
        <FormResult state={state} />
      </div>
    </form>
  );
}
