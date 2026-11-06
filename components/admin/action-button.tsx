"use client";

import { useState, useTransition, type ReactNode } from "react";

/** Button that runs a (bound) server action, with an optional inline confirmation step. */
export function ActionButton({ action, children, confirm, className = "min-h-11 text-sm text-cocoa hover:underline", done }: { action: () => Promise<unknown>; children: ReactNode; confirm?: string; className?: string; done?: string }) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const run = () =>
    start(async () => {
      const r = (await action()) as { ok?: boolean; error?: string } | undefined;
      setAsking(false);
      if (r && r.ok === false) setMsg(r.error ?? "تعذّر التنفيذ");
      else if (done) setMsg(done);
    });
  if (asking) {
    return (
      <span className="inline-flex items-center gap-2 text-sm" role="alertdialog" aria-label={confirm}>
        <span className="text-rosewood">{confirm}</span>
        <button type="button" disabled={pending} onClick={run} className="min-h-11 font-semibold text-rosewood">
          نعم
        </button>
        <button type="button" onClick={() => setAsking(false)} className="min-h-11 text-taupe">
          تراجع
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => (confirm ? setAsking(true) : run())} className={`${className} disabled:opacity-50`}>
        {children}
      </button>
      {msg ? (
        <span role="status" className="text-xs text-taupe">
          {msg}
        </span>
      ) : null}
    </span>
  );
}
