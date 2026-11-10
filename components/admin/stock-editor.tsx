"use client";

import { useRef, useState, useTransition } from "react";
import { setStock } from "@/app/actions/admin-catalog";

/** Inline stock field: saves on Enter/blur; a restock texts customers waiting for it. */
export function StockEditor({ productId, variantId, stock, label }: { productId: string; variantId: string | null; stock: number | null; label: string }) {
  const [value, setValue] = useState(stock === null ? "" : String(stock));
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const last = useRef<number | null>(stock);
  const save = () => {
    const next = value.trim() === "" ? null : Number(value);
    if (next === last.current || (next !== null && !Number.isInteger(next))) return;
    last.current = next;
    start(async () => {
      const r = await setStock(productId, variantId, next);
      setSaved(r.ok ? (r.notified ? `✓ أُبلغت ${r.notified}` : "✓") : (r.error ?? "خطأ"));
    });
  };
  return (
    <span className="inline-flex items-center gap-2">
      <label className="sr-only" htmlFor={`stk-${productId}-${variantId ?? "p"}`}>
        الكمية: {label}
      </label>
      <input
        id={`stk-${productId}-${variantId ?? "p"}`}
        type="number"
        inputMode="numeric"
        step={1}
        value={value}
        placeholder="∞"
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(null);
        }}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), save())}
        disabled={pending}
        dir="ltr"
        className="min-h-11 w-24 rounded-xl border border-cocoa/15 bg-white px-3 text-right text-cocoa focus:border-gold-deep focus:outline-none"
      />
      {saved ? <span className="text-xs text-emerald-800">{saved}</span> : null}
    </span>
  );
}
