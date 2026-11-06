"use client";

import { useState, useTransition } from "react";
import { deleteCoupon, setCouponActive } from "@/app/actions/admin-marketing";

export function CouponRowActions({ id, code, active, used }: { id: string; code: string; active: boolean; used: boolean }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <button type="button" disabled={pending} onClick={() => start(() => setCouponActive(id, !active))} className="min-h-11 text-cocoa hover:underline disabled:opacity-50">
        {active ? "إيقاف" : "تفعيل"}
      </button>
      {!used ? (
        confirm ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteCoupon(id);
                  if (!r.ok) setError(r.error ?? "تعذّر الحذف.");
                })
              }
              className="min-h-11 font-semibold text-rosewood"
              aria-label={`تأكيد حذف ${code}`}
            >
              تأكيد الحذف
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="min-h-11 text-taupe">
              تراجع
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="min-h-11 text-rosewood hover:underline">
            حذف
          </button>
        )
      ) : null}
      {error ? (
        <span role="alert" className="text-xs text-rosewood">
          {error}
        </span>
      ) : null}
    </div>
  );
}
