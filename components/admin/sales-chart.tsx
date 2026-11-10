"use client";

import { useState } from "react";

/** Daily sales bars (one series): hover/focus a day for its numbers; a table is kept for screen readers. */
export function SalesChart({ data }: { data: { day: string; sales: number; orders: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.sales));
  const fmt = (d: string) => new Intl.DateTimeFormat("ar-u-nu-latn", { day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00`));
  const a = active !== null ? data[active] : null;
  return (
    <figure>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs text-taupe">
        <span>أعلى يوم: {Math.round(max)} ₪</span>
        <span className="min-h-5 font-medium text-cocoa" aria-live="polite">
          {a ? `${fmt(a.day)} · ${a.sales} ₪ · ${a.orders} طلب` : ""}
        </span>
      </div>
      <div dir="ltr" className="flex h-44 items-end gap-[2px] border-b border-cocoa/15" onMouseLeave={() => setActive(null)} aria-hidden="true">
        {data.map((d, i) => (
          <div key={d.day} className="flex h-full flex-1 items-end" onMouseEnter={() => setActive(i)}>
            {d.sales > 0 ? (
              <div className={`w-full rounded-t-[4px] transition-colors ${active === i ? "bg-gold-soft" : "bg-berry"}`} style={{ height: `${Math.max(3, (d.sales / max) * 100)}%` }} />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-taupe" dir="ltr" aria-hidden="true">
        <span>{fmt(data[0].day)}</span>
        <span>{fmt(data[Math.floor(data.length / 2)].day)}</span>
        <span>{fmt(data[data.length - 1].day)}</span>
      </div>
      <table className="sr-only">
        <caption>المبيعات اليومية</caption>
        <thead>
          <tr>
            <th>اليوم</th>
            <th>المبيعات (₪)</th>
            <th>الطلبات</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{fmt(d.day)}</td>
              <td>{d.sales}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
