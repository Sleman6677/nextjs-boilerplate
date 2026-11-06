"use client";

import { useState, useTransition } from "react";
import { issueInvoice, saveTracking } from "@/app/actions/admin";
import { field } from "./ui";

export function TrackingForm({ orderId, carriers, carrierId, number }: { orderId: string; carriers: { id: string; name: string }[]; carrierId: string | null; number: string | null }) {
  const [c, setC] = useState(carrierId ?? "");
  const [n, setN] = useState(number ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveTracking(orderId, c, n);
          setMsg(r.ok ? "✓ حُفظ" : (r.error ?? "تعذّر الحفظ"));
        });
      }}
      className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
    >
      <label className="text-xs text-taupe">
        شركة الشحن
        <select id="trk-carrier" value={c} onChange={(e) => setC(e.target.value)} className={field}>
          <option value="">—</option>
          {carriers.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-taupe">
        رقم التتبع
        <input id="trk-number" value={n} onChange={(e) => setN(e.target.value)} dir="ltr" className={`${field} rtl:text-right`} />
      </label>
      <button type="submit" disabled={pending} className="btn btn-ink min-h-12 px-5 text-sm disabled:opacity-60">
        حفظ
      </button>
      {msg ? (
        <p role="status" className="text-xs text-taupe sm:col-span-3">
          {msg} — يصل الرقم للزبونة مع رسالة «تم الشحن».
        </p>
      ) : null}
    </form>
  );
}

export function InvoiceButton({ orderId }: { orderId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await issueInvoice(orderId);
            setMsg(r.ok ? "✓ صدرت الفاتورة" : (r.error ?? "تعذّر الإصدار"));
          })
        }
        className="btn btn-ghost-dark min-h-11 px-5 text-sm disabled:opacity-60"
      >
        {pending ? "جارٍ الإصدار…" : "إصدار فاتورة (PayPlus)"}
      </button>
      {msg ? (
        <span role="status" className="text-xs text-taupe">
          {msg}
        </span>
      ) : null}
    </span>
  );
}
