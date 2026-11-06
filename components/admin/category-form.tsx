"use client";

import { useActionState } from "react";
import { saveCategory, type FormState } from "@/app/actions/admin";
import { FormResult, SubmitButton, Toggle } from "./form-bits";
import { field, labelClass } from "./ui";

type L3 = { ar: string; he: string; en: string };

const LANGS = [
  { key: "ar", title: "العربية", dir: "rtl" },
  { key: "he", title: "עברית", dir: "rtl" },
  { key: "en", title: "English", dir: "ltr" },
] as const;

export function CategoryForm({ value, productCount }: { value: { id?: string; name: L3; description: L3; sort: number; active: boolean }; productCount?: number }) {
  const [state, action] = useActionState<FormState, FormData>(saveCategory, { ok: false, error: null });
  const uid = value.id ?? "new";
  return (
    <form action={action} className="space-y-5">
      {value.id ? <input type="hidden" name="id" value={value.id} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {LANGS.map((l) => (
          <fieldset key={l.key} className="space-y-3">
            <legend className="mb-1 text-xs font-semibold tracking-wide text-gold-deep">{l.title}</legend>
            <div>
              <label htmlFor={`${uid}-name_${l.key}`} className={labelClass}>
                الاسم {l.key === "ar" ? <span className="text-rosewood">*</span> : null}
              </label>
              <input id={`${uid}-name_${l.key}`} name={`name_${l.key}`} dir={l.dir} required={l.key === "ar"} maxLength={60} defaultValue={value.name[l.key]} className={field} />
            </div>
            <div>
              <label htmlFor={`${uid}-description_${l.key}`} className={labelClass}>
                وصف
              </label>
              <input id={`${uid}-description_${l.key}`} name={`description_${l.key}`} dir={l.dir} maxLength={200} defaultValue={value.description[l.key]} className={field} />
            </div>
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-t border-cocoa/10 pt-5">
        <div className="w-28">
          <label htmlFor={`${uid}-sort`} className={labelClass}>
            الترتيب
          </label>
          <input id={`${uid}-sort`} name="sort" type="number" step={1} inputMode="numeric" defaultValue={value.sort} dir="ltr" className={`${field} text-right`} />
        </div>
        <Toggle
          name="active"
          defaultChecked={value.active}
          label="معروضة في المتجر"
          hint={productCount === 0 ? "المجموعات الفارغة لا تظهر للزوار." : "إيقافها يخفي المجموعة ومنتجاتها."}
        />
        <div className="ms-auto flex items-center gap-4">
          <FormResult state={state} />
          <SubmitButton>{value.id ? "حفظ" : "إضافة المجموعة"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
