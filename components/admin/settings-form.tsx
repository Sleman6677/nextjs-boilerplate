"use client";

import { useActionState, useState } from "react";
import { saveSettings, type FormState } from "@/app/actions/admin";
import { FormResult, SubmitButton } from "./form-bits";
import { field, hintClass, labelClass } from "./ui";

export type SettingsValue = { shippingFee: number; freeShippingThreshold: number | null; firstOrderDiscountPct: number; pointsEarnPct: number; pointValue: number };

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

export function SettingsForm({ value }: { value: SettingsValue }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettings, { ok: false, error: null });
  const [free, setFree] = useState(value.freeShippingThreshold !== null);
  const [earn, setEarn] = useState(String(value.pointsEarnPct));
  const [worth, setWorth] = useState(String(value.pointValue));
  const example = 200;
  const pts = Math.floor((example * (Number(earn) || 0)) / 100);
  const ptsValue = pts * (Number(worth) || 0);

  return (
    <form action={action} className="grid max-w-3xl gap-5">
      <section className="grid gap-5 rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:grid-cols-2 sm:p-8">
        <h2 className="text-base font-semibold text-cocoa sm:col-span-2">التوصيل</h2>
        <div>
          <label htmlFor="shipping_fee" className={labelClass}>
            سعر التوصيل (₪)
          </label>
          <input id="shipping_fee" name="shipping_fee" type="number" inputMode="decimal" min={0} step="0.01" required defaultValue={value.shippingFee} dir="ltr" className={`${field} text-right`} />
          <p className={hintClass}>0 = توصيل مجاني دائمًا.</p>
        </div>
        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-cocoa">
            <input type="checkbox" name="free_shipping" checked={free} onChange={(e) => setFree(e.target.checked)} className="h-5 w-5 accent-gold-deep" />
            توصيل مجاني فوق مبلغ معيّن
          </label>
          <label htmlFor="free_shipping_threshold" className="sr-only">
            المبلغ (₪)
          </label>
          <input
            id="free_shipping_threshold"
            name="free_shipping_threshold"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            disabled={!free}
            required={free}
            defaultValue={value.freeShippingThreshold ?? 300}
            dir="ltr"
            className={`${field} text-right disabled:opacity-40`}
          />
          <p className={hintClass}>يُحسب بعد الخصم وقبل النقاط.</p>
        </div>
      </section>

      <section className="grid gap-5 rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:grid-cols-2 sm:p-8">
        <h2 className="text-base font-semibold text-cocoa sm:col-span-2">الخصومات</h2>
        <div>
          <label htmlFor="first_order_discount_pct" className={labelClass}>
            خصم الطلب الأول (٪)
          </label>
          <input id="first_order_discount_pct" name="first_order_discount_pct" type="number" inputMode="decimal" min={0} max={100} step="0.5" required defaultValue={value.firstOrderDiscountPct} dir="ltr" className={`${field} text-right`} />
          <p className={hintClass}>0 = بدون خصم. يُطبَّق تلقائيًا ما لم يُستعمل كوبون.</p>
        </div>
      </section>

      <section className="grid gap-5 rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:grid-cols-2 sm:p-8">
        <h2 className="text-base font-semibold text-cocoa sm:col-span-2">النقاط</h2>
        <div>
          <label htmlFor="points_earn_pct" className={labelClass}>
            نسبة النقاط من قيمة الطلب (٪)
          </label>
          <input id="points_earn_pct" name="points_earn_pct" type="number" inputMode="decimal" min={0} max={100} step="0.5" required value={earn} onChange={(e) => setEarn(e.target.value)} dir="ltr" className={`${field} text-right`} />
          <p className={hintClass}>0 = إيقاف كسب النقاط.</p>
        </div>
        <div>
          <label htmlFor="point_value" className={labelClass}>
            قيمة النقطة الواحدة (₪)
          </label>
          <input id="point_value" name="point_value" type="number" inputMode="decimal" min={0.01} step="0.01" required value={worth} onChange={(e) => setWorth(e.target.value)} dir="ltr" className={`${field} text-right`} />
        </div>
        <p className="rounded-2xl bg-gold/15 px-4 py-3 text-sm text-cocoa sm:col-span-2" aria-live="polite">
          مثال: طلب منتجات بـ {example} ₪ يكسب <strong>{pts} نقطة</strong> = خصم {fmt(ptsValue)} ₪ على طلب قادم. تُضاف النقاط عند تأكيد التوصيل، ولا تُستعمل لدفع التوصيل.
        </p>
      </section>

      <div className="flex items-center gap-4">
        <SubmitButton>حفظ الإعدادات</SubmitButton>
        <FormResult state={state} />
      </div>
    </form>
  );
}
