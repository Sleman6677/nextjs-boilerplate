"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/admin";
import { sendPersonalCoupon } from "@/app/actions/admin";
import { FormResult, SubmitButton } from "./form-bits";
import { field } from "./ui";

export function PersonalCouponForm({ userId, consent }: { userId: string; consent: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(sendPersonalCoupon, { ok: false, error: null });
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <label className="text-xs text-taupe">
        النوع
        <select name="kind" className={`${field} w-28`}>
          <option value="percent">٪</option>
          <option value="fixed">₪</option>
        </select>
      </label>
      <label className="text-xs text-taupe">
        القيمة
        <input name="value" type="number" inputMode="decimal" min={1} required dir="ltr" className={`${field} w-24 text-right`} />
      </label>
      <label className="text-xs text-taupe">
        أيام
        <input name="days" type="number" inputMode="numeric" min={1} defaultValue={14} dir="ltr" className={`${field} w-20 text-right`} />
      </label>
      {consent ? (
        <label className="flex min-h-12 items-center gap-2 text-sm text-cocoa">
          <input type="checkbox" name="send" defaultChecked className="h-4 w-4 accent-[#7d5e27]" /> إرسال SMS
        </label>
      ) : null}
      <SubmitButton className="min-h-12 px-5 text-sm">إنشاء</SubmitButton>
      <FormResult state={state} savedText="أُنشئ الكوبون" />
    </form>
  );
}
