"use client";

import { useActionState, useState } from "react";
import { saveOffer } from "@/app/actions/admin-marketing";
import type { FormState } from "@/app/actions/admin";
import type { AdminOffer } from "@/lib/admin-reports";
import { FormResult, SubmitButton, Toggle } from "./form-bits";
import { ScopePicker } from "./scope-picker";
import { field, hintClass, labelClass } from "./ui";

export function OfferForm({ value, products, categories }: { value: AdminOffer | null; products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveOffer, { ok: false, error: null });
  const [kind, setKind] = useState(value?.kind ?? "percent");
  const d = (v: string | null) => (v ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date(v)) : "");
  return (
    <form action={action} className="grid max-w-3xl gap-5 rounded-3xl border border-cocoa/10 bg-surface p-5 sm:grid-cols-2 sm:p-8">
      {value ? <input type="hidden" name="id" value={value.id} /> : null}
      <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
        {(["ar", "he", "en"] as const).map((l) => (
          <div key={l}>
            <label htmlFor={`name_${l}`} className={labelClass}>
              اسم العرض ({l === "ar" ? "العربية" : l === "he" ? "עברית" : "English"}) {l === "ar" ? <span className="text-rosewood">*</span> : null}
            </label>
            <input id={`name_${l}`} name={`name_${l}`} dir={l === "en" ? "ltr" : "rtl"} defaultValue={value?.name[l] ?? ""} required={l === "ar"} maxLength={80} placeholder={l === "ar" ? "٣ رموش بخصم ١٥٪" : ""} className={field} />
          </div>
        ))}
        <p className={`${hintClass} sm:col-span-3`}>يظهر الاسم للزبونات بجانب السعر في المتجر.</p>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className={labelClass}>نوع الخصم</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              { id: "percent", label: "نسبة مئوية" },
              { id: "fixed", label: "مبلغ ثابت لكل قطعة" },
            ] as const
          ).map((k) => (
            <label key={k.id} className="flex min-h-12 cursor-pointer items-center rounded-2xl border border-cocoa/15 px-4 text-sm font-semibold has-checked:border-ink has-checked:bg-ink has-checked:text-ivory">
              <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="value" className={labelClass}>
          القيمة {kind === "percent" ? "(٪)" : "(₪)"}
        </label>
        <input id="value" name="value" type="number" inputMode="decimal" min={0.01} step="0.01" max={kind === "percent" ? 100 : undefined} required defaultValue={value?.value ?? ""} dir="ltr" className={`${field} text-right`} />
      </div>
      <div>
        <label htmlFor="min_qty" className={labelClass}>
          من كمية
        </label>
        <input id="min_qty" name="min_qty" type="number" inputMode="numeric" min={1} step={1} defaultValue={value?.minQty ?? 1} dir="ltr" className={`${field} text-right`} />
        <p className={hintClass}>1 = تخفيض عادي. 3 = عند شراء ٣ قطع أو أكثر من المنتجات المشمولة.</p>
      </div>
      <div className="sm:col-span-2">
        <ScopePicker scope={value?.scope ?? "all"} productIds={value?.productIds ?? []} categoryIds={value?.categoryIds ?? []} products={products} categories={categories} />
      </div>
      <div>
        <label htmlFor="starts_at" className={labelClass}>
          يبدأ في
        </label>
        <input id="starts_at" name="starts_at" type="date" defaultValue={d(value?.startsAt ?? null)} className={field} />
      </div>
      <div>
        <label htmlFor="ends_at" className={labelClass}>
          ينتهي في
        </label>
        <input id="ends_at" name="ends_at" type="date" defaultValue={d(value?.endsAt ?? null)} className={field} />
      </div>
      <div className="sm:col-span-2">
        <Toggle name="active" defaultChecked={value?.active ?? true} label="فعّال" />
      </div>
      <p className="rounded-2xl bg-sand/50 px-4 py-3 text-xs leading-6 text-taupe sm:col-span-2">العروض لا تجتمع مع بعضها: يحصل المنتج على أفضل سعر بين سعر التخفيض والعروض. فوقها يمكن استعمال خصم واحد (كوبون أو خصم الطلب الأول أو عيد الميلاد).</p>
      <div className="flex items-center gap-4 sm:col-span-2">
        <SubmitButton>{value ? "حفظ التعديلات" : "إنشاء العرض"}</SubmitButton>
        <FormResult state={state} />
      </div>
    </form>
  );
}
