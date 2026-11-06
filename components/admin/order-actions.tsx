"use client";

import { useState, useTransition } from "react";
import { changeOrderStatus, markOrderPaid } from "@/app/actions/admin";
import { ORDER_STATUSES, type OrderStatus, type PaymentMethod } from "@/lib/order-status";
import { field, STATUS_LABEL } from "./ui";

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  received: { to: "preparing", label: "بدء التجهيز" },
  preparing: { to: "shipped", label: "تم الشحن" },
  shipped: { to: "delivered", label: "تم التوصيل" },
};

export function OrderActions({
  orderId,
  status,
  method,
  paymentStatus,
  pointsEarned,
}: {
  orderId: string;
  status: OrderStatus;
  method: PaymentMethod;
  paymentStatus: string;
  pointsEarned: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [manual, setManual] = useState<string>("");
  const [note, setNote] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "تعذّر تنفيذ العملية.");
      else {
        setConfirmCancel(false);
        setManual("");
        setNote("");
      }
    });
  }

  if (status === "cancelled") {
    return <p className="text-sm text-taupe">هذا الطلب ملغي. أُعيدت النقاط المستعملة وحُرّر الكوبون إن وُجد.</p>;
  }

  const next = NEXT[status];
  const unpaid = paymentStatus !== "paid";

  return (
    <div className="space-y-5" aria-busy={pending}>
      <div className="flex flex-wrap gap-2">
        {status === "awaiting_payment" ? (
          <button type="button" disabled={pending} onClick={() => run(() => markOrderPaid(orderId))} className="btn btn-gold min-h-12 px-6 disabled:opacity-60">
            تأكيد استلام الدفع
          </button>
        ) : null}
        {next ? (
          <button type="button" disabled={pending} onClick={() => run(() => changeOrderStatus(orderId, next.to))} className="btn btn-ink min-h-12 px-6 disabled:opacity-60">
            {next.label} ←
          </button>
        ) : null}
        {unpaid && status !== "awaiting_payment" ? (
          <button type="button" disabled={pending} onClick={() => run(() => markOrderPaid(orderId))} className="btn btn-ghost-dark min-h-12 px-5 text-sm disabled:opacity-60">
            تسجيل كمدفوع
          </button>
        ) : null}
      </div>

      {next?.to === "delivered" && pointsEarned > 0 ? <p className="text-xs text-taupe">عند تأكيد التوصيل تُضاف {pointsEarned} نقطة لحساب الزبون تلقائيًا.</p> : null}
      {next?.to === "delivered" && method === "cash" && unpaid ? <p className="text-xs text-taupe">الدفع النقدي يُسجَّل كمدفوع تلقائيًا عند التوصيل.</p> : null}

      <details className="group rounded-2xl border border-cocoa/10 bg-white/50 p-4">
        <summary className="min-h-8 cursor-pointer list-none text-sm font-medium text-cocoa">
          <span className="inline-block transition-transform duration-200 group-open:-rotate-90">‹</span> تغيير الحالة يدويًا أو إضافة ملاحظة
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
          <div>
            <label htmlFor="manual-status" className="text-xs text-taupe">
              الحالة الجديدة
            </label>
            <select id="manual-status" value={manual} onChange={(e) => setManual(e.target.value)} className={field}>
              <option value="">اختيار…</option>
              {ORDER_STATUSES.filter((s) => s !== status && s !== "cancelled").map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="manual-note" className="text-xs text-taupe">
              ملاحظة داخلية (اختياري)
            </label>
            <input id="manual-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={field} />
          </div>
          <button
            type="button"
            disabled={pending || !manual}
            onClick={() => run(() => changeOrderStatus(orderId, manual, note))}
            className="btn btn-ink min-h-12 px-6 disabled:opacity-40"
          >
            حفظ
          </button>
        </div>
      </details>

      <div className="border-t border-cocoa/10 pt-4">
        {confirmCancel ? (
          <div className="rounded-2xl bg-rosewood/10 p-4 text-sm text-rosewood" role="alertdialog" aria-label="تأكيد إلغاء الطلب">
            <p className="font-semibold">إلغاء الطلب نهائيًا؟</p>
            <p className="mt-1">تُعاد النقاط التي استُعملت، ويُسحب ما أُضيف من نقاط، ويعود الكوبون قابلًا للاستعمال.</p>
            {paymentStatus === "paid" && method !== "cash" ? <p className="mt-1 font-medium">الطلب مدفوع: إرجاع المبلغ يتم من حساب PayPlus.</p> : null}
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => changeOrderStatus(orderId, "cancelled", note))} className="min-h-11 rounded-full bg-rosewood px-5 text-ivory disabled:opacity-60">
                نعم، إلغاء الطلب
              </button>
              <button type="button" onClick={() => setConfirmCancel(false)} className="min-h-11 rounded-full px-5 text-cocoa hover:bg-ivory">
                تراجع
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-11 text-sm text-rosewood hover:underline">
            إلغاء الطلب
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rosewood">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p role="status" className="text-sm text-taupe">
          جارٍ التحديث…
        </p>
      ) : null}
    </div>
  );
}
