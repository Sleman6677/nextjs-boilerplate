"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/admin";

export function SubmitButton({ children, pendingText = "جارٍ الحفظ…", className = "" }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-ink min-h-12 px-7 disabled:opacity-60 ${className}`}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Error or "saved" line under a form; keyed on `at` so screen readers announce each result. */
export function FormResult({ state, savedText = "تم الحفظ" }: { state: FormState; savedText?: string }) {
  if (state.error) {
    return (
      <p key={state.at} role="alert" className="text-sm text-rosewood">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p key={state.at} role="status" className="text-sm text-emerald-800">
        ✓ {savedText}
      </p>
    );
  }
  return null;
}

export function Toggle({ name, defaultChecked, label, hint }: { name: string; defaultChecked?: boolean; label: string; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-cocoa/20 transition-colors duration-200 peer-checked:bg-gold-deep peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold after:absolute after:top-0.5 after:start-0.5 after:h-5 after:w-5 after:rounded-full after:bg-ivory after:shadow after:transition-transform after:duration-200 peer-checked:after:-translate-x-5 ltr:peer-checked:after:translate-x-5"
      />
      <span>
        <span className="block text-sm font-medium text-cocoa">{label}</span>
        {hint ? <span className="block text-xs text-taupe">{hint}</span> : null}
      </span>
    </label>
  );
}
