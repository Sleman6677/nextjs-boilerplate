"use client";

import { useActionState, useState, type ReactNode } from "react";
import type { FormState } from "@/app/actions/admin";
import { saveSettings } from "@/app/actions/admin-settings";
import type { StoreSettings } from "@/lib/orders";
import { FormResult, SubmitButton, Toggle } from "./form-bits";
import { field, hintClass, labelClass } from "./ui";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-3xl border border-cocoa/10 bg-ivory p-5 sm:grid-cols-2 sm:p-8">
      <h2 className="text-base font-semibold text-cocoa sm:col-span-2">{title}</h2>
      {children}
    </section>
  );
}

function Num({ id, label, value, hint, min = 0, step = "0.01", required = true }: { id: string; label: string; value: number | string | null; hint?: string; min?: number; step?: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} name={id} type="number" inputMode="decimal" min={min} step={step} required={required} defaultValue={value ?? ""} dir="ltr" className={`${field} text-right`} />
      {hint ? <p className={hintClass}>{hint}</p> : null}
    </div>
  );
}

export function SettingsForm({ value, ownerPhone, whatsapp }: { value: StoreSettings; ownerPhone: string; whatsapp: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettings, { ok: false, error: null });
  const [free, setFree] = useState(value.freeShippingThreshold !== null);
  const [expire, setExpire] = useState(value.pointsExpiryMonths !== null);
  const [earn, setEarn] = useState(String(value.pointsEarnPct));
  const [worth, setWorth] = useState(String(value.pointValue));
  const pts = Math.floor((200 * (Number(earn) || 0)) / 100);

  return (
    <form action={action} className="grid max-w-3xl gap-5">
      <Section title="واجهة المتجر والتواصل">
        {(["ar", "he", "en"] as const).map((l) => (
          <div key={l} className="sm:col-span-2">
            <label htmlFor={`announcement_${l}`} className={labelClass}>
              شريط الإعلان أعلى الموقع ({l === "ar" ? "العربية" : l === "he" ? "עברית" : "English"})
            </label>
            <input id={`announcement_${l}`} name={`announcement_${l}`} dir={l === "en" ? "ltr" : "rtl"} maxLength={160} defaultValue={value.announcement[l]} placeholder={l === "ar" ? "فارغ = «توصيل مجاني فوق …» تلقائيًا" : ""} className={field} />
          </div>
        ))}
        <div>
          <label htmlFor="instagram" className={labelClass}>
            حساب Instagram
          </label>
          <input id="instagram" name="instagram" dir="ltr" defaultValue={value.instagram ?? ""} placeholder="seraglashes" className={`${field} rtl:text-right`} />
        </div>
        <div>
          <label htmlFor="tiktok" className={labelClass}>
            حساب TikTok
          </label>
          <input id="tiktok" name="tiktok" dir="ltr" defaultValue={value.tiktok ?? ""} placeholder="seraglashes" className={`${field} rtl:text-right`} />
        </div>
        <div>
          <label htmlFor="whatsapp" className={labelClass}>
            رقم WhatsApp للمتجر
          </label>
          <input id="whatsapp" name="whatsapp" type="tel" dir="ltr" defaultValue={whatsapp} placeholder="053-772-5568" className={`${field} rtl:text-right`} />
        </div>
        <div>
          <label htmlFor="owner_phone" className={labelClass}>
            هاتف تنبيهات المخزون
          </label>
          <input id="owner_phone" name="owner_phone" type="tel" dir="ltr" defaultValue={ownerPhone} placeholder="05X-XXX-XXXX" className={`${field} rtl:text-right`} />
          <p className={hintClass}>تصله رسالة عند انخفاض كمية منتج.</p>
        </div>
      </Section>

      <Section title="التوصيل">
        <Num id="shipping_fee" label="سعر التوصيل العام (₪)" value={value.shippingFee} hint="أسعار المناطق تُحدَّد في «الشحن»." />
        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-cocoa">
            <input type="checkbox" name="free_shipping" checked={free} onChange={(e) => setFree(e.target.checked)} className="h-5 w-5 accent-[#7d5e27]" />
            توصيل مجاني فوق مبلغ
          </label>
          <input name="free_shipping_threshold" type="number" inputMode="decimal" min={0} step="0.01" disabled={!free} required={free} defaultValue={value.freeShippingThreshold ?? 300} dir="ltr" aria-label="المبلغ" className={`${field} text-right disabled:opacity-40`} />
          <p className={hintClass}>يُحسب بعد الخصم.</p>
        </div>
      </Section>

      <Section title="الخصومات">
        <Num id="first_order_discount_pct" label="خصم الطلب الأول (٪)" value={value.firstOrderDiscountPct} step="0.5" hint="0 = بدون. لا يجتمع مع كوبون." />
      </Section>

      <Section title="النقاط">
        <div>
          <label htmlFor="points_earn_pct" className={labelClass}>
            النقاط من قيمة الطلب (٪)
          </label>
          <input id="points_earn_pct" name="points_earn_pct" type="number" inputMode="decimal" min={0} max={100} step="0.5" required value={earn} onChange={(e) => setEarn(e.target.value)} dir="ltr" className={`${field} text-right`} />
        </div>
        <div>
          <label htmlFor="point_value" className={labelClass}>
            قيمة النقطة (₪)
          </label>
          <input id="point_value" name="point_value" type="number" inputMode="decimal" min={0.01} step="0.01" required value={worth} onChange={(e) => setWorth(e.target.value)} dir="ltr" className={`${field} text-right`} />
        </div>
        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-cocoa">
            <input type="checkbox" name="points_expire" checked={expire} onChange={(e) => setExpire(e.target.checked)} className="h-5 w-5 accent-[#7d5e27]" />
            النقاط تنتهي بعد مدة
          </label>
          <input name="points_expiry_months" type="number" inputMode="numeric" min={1} step={1} disabled={!expire} required={expire} defaultValue={value.pointsExpiryMonths ?? 12} dir="ltr" aria-label="عدد الأشهر" className={`${field} text-right disabled:opacity-40`} />
          <p className={hintClass}>بالأشهر من تاريخ إضافة النقاط.</p>
        </div>
        <p className="self-center rounded-2xl bg-gold/15 px-4 py-3 text-sm text-cocoa" aria-live="polite">
          مثال: طلب بـ 200 ₪ يكسب <strong>{pts} نقطة</strong> = {Math.round(pts * (Number(worth) || 0) * 100) / 100} ₪، تُضاف بعد التسليم.
        </p>
      </Section>

      <Section title="بطاقات الهدية">
        <Num id="gift_card_bonus_pct" label="الزيادة على المبلغ المدفوع (٪)" value={value.giftCardBonusPct} step="0.5" hint="10 = تدفع 200 وتحصل على 220." />
        <Num id="gift_card_valid_months" label="الصلاحية (أشهر)" value={value.giftCardValidMonths} step="1" min={1} required={false} hint="فارغ = بلا انتهاء." />
      </Section>

      <Section title="عيد الميلاد">
        <div className="sm:col-span-2">
          <Toggle name="birthday_enabled" defaultChecked={value.birthday.enabled} label="إرسال خصم عيد ميلاد تلقائي" hint="كوبون شخصي يُنشأ صباح يوم الميلاد ويصل برسالة (لمن وافقت على العروض)." />
        </div>
        <div>
          <label htmlFor="birthday_kind" className={labelClass}>
            نوع الخصم
          </label>
          <select id="birthday_kind" name="birthday_kind" defaultValue={value.birthday.kind} className={field}>
            <option value="percent">نسبة ٪</option>
            <option value="fixed">مبلغ ₪</option>
          </select>
        </div>
        <Num id="birthday_value" label="القيمة" value={value.birthday.value} />
        <Num id="birthday_valid_days" label="صالح لمدة (أيام)" value={value.birthday.validDays} step="1" min={1} />
      </Section>

      <Section title="السلات المتروكة والطلبات">
        <div className="sm:col-span-2">
          <Toggle name="abandoned_cart_enabled" defaultChecked={value.abandonedCart.enabled} label="تذكير تلقائي بالسلة المتروكة" hint="للزبونات المسجّلات اللواتي وافقن على رسائل العروض." />
        </div>
        <Num id="abandoned_cart_hours" label="التذكير بعد (ساعات)" value={value.abandonedCart.hours} step="1" min={1} />
        <Num id="unpaid_cancel_hours" label="إلغاء طلبات البطاقة غير المدفوعة بعد (ساعات)" value={value.unpaidCancelHours} step="1" min={1} hint="تعود الكمية للمخزون." />
      </Section>

      <Section title="الفواتير (PayPlus)">
        <div className="sm:col-span-2">
          <label htmlFor="invoice_doc_type" className={labelClass}>
            نوع المستند للطلبات النقدية
          </label>
          <select id="invoice_doc_type" name="invoice_doc_type" defaultValue={value.invoiceDocType} className={field}>
            <option value="inv_tax_receipt">חשבונית מס קבלה (עוסק מורשה)</option>
            <option value="inv_receipt">קבלה (עוסק פטור)</option>
          </select>
          <p className={hintClass}>الدفع الإلكتروني: PayPlus يصدر الفاتورة تلقائيًا إذا كانت خدمة Invoice+ مفعّلة في صفحة الدفع.</p>
        </div>
      </Section>

      <div className="flex items-center gap-4">
        <SubmitButton>حفظ الإعدادات</SubmitButton>
        <FormResult state={state} />
      </div>
    </form>
  );
}
