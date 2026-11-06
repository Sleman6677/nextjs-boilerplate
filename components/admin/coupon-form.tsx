"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/admin";
import { saveCoupon } from "@/app/actions/admin-marketing";
import { ScopePicker } from "./scope-picker";
import { FormResult, SubmitButton, Toggle } from "./form-bits";
import { field, hintClass, labelClass } from "./ui";

export type CouponFormValue = {
  id?: string;
  code: string;
  kind: "percent" | "fixed";
  value: number | "";
  minSubtotal: number;
  maxUses: number | "";
  startsAt: string;
  endsAt: string;
  oncePerCustomer: boolean;
  active: boolean;
  name: string;
  source: string;
  excludeSale: boolean;
  scope: string;
  productIds: string[];
  categoryIds: string[];
};

export function CouponForm({ value, products, categories }: { value: CouponFormValue; products: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveCoupon, { ok: false, error: null });
  const [kind, setKind] = useState(value.kind);
  return (
    <form action={action} className="grid max-w-3xl gap-5 rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:grid-cols-2 sm:p-8">
      {value.id ? <input type="hidden" name="id" value={value.id} /> : null}
      <div className="sm:col-span-2">
        <label htmlFor="code" className={labelClass}>
          رمز الكوبون <span className="text-rosewood">*</span>
        </label>
        <input
          id="code"
          name="code"
          required
          minLength={3}
          maxLength={32}
          pattern="[A-Za-z0-9_\-]+"
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          defaultValue={value.code}
          placeholder="SUMMER10"
          className={`${field} font-semibold tracking-widest uppercase`}
        />
        <p className={hintClass}>أحرف إنجليزية وأرقام فقط. الزبون يكتبه في صفحة الدفع.</p>
      </div>

      <div>
        <label htmlFor="name" className={labelClass}>
          اسم داخلي
        </label>
        <input id="name" name="name" maxLength={80} defaultValue={value.name} placeholder="مثلًا: حملة العيد" className={field} />
      </div>
      <div>
        <label htmlFor="source" className={labelClass}>
          المصدر
        </label>
        <input id="source" name="source" maxLength={60} defaultValue={value.source} placeholder="instagram، tiktok، اسم المؤثرة…" dir="ltr" className={`${field} rtl:text-right`} />
        <p className={hintClass}>كل طلب بهذا الكود يُحسب لهذا المصدر في «مصادر الطلبات».</p>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className={labelClass}>نوع الخصم</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              { id: "percent", label: "نسبة مئوية", sub: "مثلًا 10٪ من المنتجات" },
              { id: "fixed", label: "مبلغ ثابت", sub: "مثلًا 30 ₪ خصم" },
            ] as const
          ).map((k) => (
            <label key={k.id} className="flex min-h-14 cursor-pointer flex-col justify-center rounded-2xl border border-cocoa/15 px-4 py-2 has-checked:border-ink has-checked:bg-ink has-checked:text-ivory">
              <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} className="sr-only" />
              <span className="text-sm font-semibold">{k.label}</span>
              <span className="text-xs opacity-70">{k.sub}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="value" className={labelClass}>
          قيمة الخصم {kind === "percent" ? "(٪)" : "(₪)"} <span className="text-rosewood">*</span>
        </label>
        <input id="value" name="value" type="number" inputMode="decimal" required min={0.01} max={kind === "percent" ? 100 : undefined} step="0.01" defaultValue={value.value} dir="ltr" className={`${field} text-right`} />
      </div>
      <div>
        <label htmlFor="min_subtotal" className={labelClass}>
          الحد الأدنى للطلب (₪)
        </label>
        <input id="min_subtotal" name="min_subtotal" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={value.minSubtotal} dir="ltr" className={`${field} text-right`} />
        <p className={hintClass}>0 = بدون حد أدنى.</p>
      </div>
      <div>
        <label htmlFor="starts_at" className={labelClass}>
          يبدأ في
        </label>
        <input id="starts_at" name="starts_at" type="date" defaultValue={value.startsAt} dir="ltr" className={`${field} text-right`} />
      </div>
      <div>
        <label htmlFor="ends_at" className={labelClass}>
          ينتهي في
        </label>
        <input id="ends_at" name="ends_at" type="date" defaultValue={value.endsAt} dir="ltr" className={`${field} text-right`} />
        <p className={hintClass}>فارغ = بدون تاريخ انتهاء. يعمل حتى نهاية اليوم بتوقيت البلاد.</p>
      </div>
      <div>
        <label htmlFor="max_uses" className={labelClass}>
          عدد مرات الاستعمال الكلي
        </label>
        <input id="max_uses" name="max_uses" type="number" inputMode="numeric" min={1} step={1} defaultValue={value.maxUses} placeholder="بدون حد" dir="ltr" className={`${field} text-right`} />
      </div>
      <div className="sm:col-span-2">
        <ScopePicker scope={value.scope} productIds={value.productIds} categoryIds={value.categoryIds} products={products} categories={categories} />
      </div>
      <div className="space-y-1 self-center">
        <Toggle name="exclude_sale" defaultChecked={value.excludeSale} label="لا ينطبق على المنتجات المخفّضة" />
        <Toggle name="once_per_customer" defaultChecked={value.oncePerCustomer} label="مرة واحدة لكل حساب" />
        <Toggle name="active" defaultChecked={value.active} label="فعّال" />
      </div>

      <p className="rounded-2xl bg-sand/50 px-4 py-3 text-xs leading-6 text-taupe sm:col-span-2">
        خصم واحد فقط في كل طلب: إذا استُعمل كوبون فإنه يحلّ محل خصم الطلب الأول. النقاط والتوصيل المجاني يعملان مع الكوبون.
      </p>

      <div className="flex items-center gap-4 sm:col-span-2">
        <SubmitButton>{value.id ? "حفظ التعديلات" : "إنشاء الكوبون"}</SubmitButton>
        <FormResult state={state} />
      </div>
    </form>
  );
}
