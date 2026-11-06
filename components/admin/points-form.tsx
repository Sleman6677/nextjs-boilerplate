"use client";

import { useActionState } from "react";
import { adjustPoints, type FormState } from "@/app/actions/admin";
import { FormResult, SubmitButton } from "./form-bits";
import { field } from "./ui";

export function PointsForm({ userId, label }: { userId: string; label: string }) {
  const [state, action] = useActionState<FormState, FormData>(adjustPoints, { ok: false, error: null });
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="w-36">
        <label htmlFor={`pts-${userId}`} className="text-xs text-taupe">
          {label}
        </label>
        <input id={`pts-${userId}`} name="delta" type="number" step={1} required placeholder="50 أو -20" dir="ltr" className={`${field} text-right`} />
      </div>
      <SubmitButton pendingText="…" className="min-h-12 px-5 text-sm">
        تطبيق
      </SubmitButton>
      <FormResult state={state} savedText="تم تعديل الرصيد" />
    </form>
  );
}
