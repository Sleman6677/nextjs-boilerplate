"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/admin";
import { broadcast, issueGiftCard, remindCart, saveTemplate } from "@/app/actions/admin-marketing";
import { FormResult, SubmitButton, Toggle } from "./form-bits";
import { field, hintClass, labelClass } from "./ui";

const initial: FormState = { ok: false, error: null };

export function IssueGiftCardForm() {
  const [state, action] = useActionState(issueGiftCard, initial);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[8rem_8rem_1fr_auto] sm:items-end">
      <label className="text-xs text-taupe">
        القيمة (₪)
        <input name="value" type="number" inputMode="decimal" min={1} required dir="ltr" className={`${field} text-right`} />
      </label>
      <label className="text-xs text-taupe">
        صالحة (أشهر)
        <input name="months" type="number" inputMode="numeric" min={1} defaultValue={12} dir="ltr" className={`${field} text-right`} />
      </label>
      <label className="text-xs text-taupe">
        إرسال الكود إلى رقم (اختياري)
        <input name="phone" type="tel" inputMode="tel" dir="ltr" placeholder="05X-XXX-XXXX" className={`${field} rtl:text-right`} />
      </label>
      <SubmitButton className="min-h-12 px-6 text-sm">إصدار</SubmitButton>
      {state.ok ? (
        <p role="status" className="text-sm text-emerald-800 sm:col-span-4">
          تم إصدار البطاقة: <span dir="ltr" className="font-mono font-semibold">{state.error}</span>
        </p>
      ) : (
        <div className="sm:col-span-4">
          <FormResult state={state} />
        </div>
      )}
    </form>
  );
}

export function TemplateForm({ id, label, kind, vars, value }: { id: string; label: string; kind: string; vars: readonly string[]; value: { ar: string; he: string; en: string; enabled: boolean } }) {
  const [state, action] = useActionState(saveTemplate, initial);
  return (
    <details className="group rounded-3xl border border-cocoa/10 bg-surface p-5">
      <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3">
        <span className="font-semibold text-cocoa">{label}</span>
        <span className="text-xs text-taupe">
          {kind === "marketing" ? "تسويقية · تحتاج موافقة" : "خدماتية"} {value.enabled ? "" : "· موقوفة"}
        </span>
      </summary>
      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="key" value={id} />
        {(["ar", "he", "en"] as const).map((l) => (
          <label key={l} className="block text-xs text-taupe">
            {l === "ar" ? "العربية" : l === "he" ? "עברית" : "English"}
            <textarea name={`body_${l}`} dir={l === "en" ? "ltr" : "rtl"} rows={2} maxLength={600} defaultValue={value[l]} className={field} />
          </label>
        ))}
        <p className={hintClass}>
          المتغيرات: {vars.map((v) => `{${v}}`).join(" ")} {kind === "marketing" ? "· تُضاف تلقائيًا كلمة «פרסומת» ورابط إلغاء الاشتراك." : ""}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {id !== "login_code" ? <Toggle name="enabled" defaultChecked={value.enabled} label="مفعّلة" /> : null}
          <SubmitButton className="min-h-11 px-6 text-sm">حفظ</SubmitButton>
          <FormResult state={state} />
        </div>
      </form>
    </details>
  );
}

export function BroadcastForm({ products, consenting }: { products: { id: string; name: string }[]; consenting: number }) {
  const [state, action] = useActionState(broadcast, initial);
  const [audience, setAudience] = useState("all");
  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className={labelClass}>إلى من؟</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { id: "all", label: `كل من وافقت (${consenting})` },
            { id: "birthday_month", label: "عيد ميلادها هذا الشهر" },
            { id: "bought_product", label: "اشترت منتجًا معيّنًا" },
            { id: "inactive", label: "لم تطلب منذ ٦٠ يومًا" },
          ].map((a) => (
            <label key={a.id} className="flex min-h-11 cursor-pointer items-center rounded-full border border-cocoa/15 px-4 text-sm has-checked:border-ink has-checked:bg-ink has-checked:text-ivory">
              <input type="radio" name="audience" value={a.id} checked={audience === a.id} onChange={() => setAudience(a.id)} className="sr-only" />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>
      {audience === "bought_product" ? (
        <label className="block text-xs text-taupe">
          المنتج
          <select name="product_id" className={field} required>
            <option value="">اختيار…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {(["ar", "he", "en"] as const).map((l) => (
        <label key={l} className="block text-xs text-taupe">
          النص {l === "ar" ? "بالعربية (مطلوب)" : l === "he" ? "بالعبرية (اختياري)" : "بالإنجليزية (اختياري)"}
          <textarea name={`body_${l}`} dir={l === "en" ? "ltr" : "rtl"} rows={2} maxLength={500} required={l === "ar"} className={field} />
        </label>
      ))}
      <p className={hintClass}>تصل فقط لمن وافقت على رسائل العروض، بلغتها، مع «פרסומת» ورابط إلغاء الاشتراك كما يطلب القانون.</p>
      <div className="flex items-center gap-4">
        <SubmitButton pendingText="جارٍ الإرسال…">إرسال</SubmitButton>
        {state.ok ? (
          <p role="status" className="text-sm text-emerald-800">
            ✓ أُرسلت إلى {state.error} زبونة
          </p>
        ) : (
          <FormResult state={state} />
        )}
      </div>
    </form>
  );
}

export function RemindCartForm({ cartId }: { cartId: string }) {
  const [state, action] = useActionState(remindCart, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="cart_id" value={cartId} />
      <label className="text-xs text-taupe">
        كوبون خصم ٪ (اختياري)
        <input name="value" type="number" inputMode="numeric" min={1} max={100} placeholder="مثلًا 10" dir="ltr" className={`${field} w-32 text-right`} />
      </label>
      <SubmitButton className="min-h-12 px-5 text-sm" pendingText="…">
        إرسال تذكير
      </SubmitButton>
      <FormResult state={state} savedText="أُرسل التذكير" />
    </form>
  );
}
