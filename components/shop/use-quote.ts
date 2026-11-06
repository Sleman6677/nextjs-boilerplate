"use client";

import { useEffect, useRef, useState } from "react";
import { getQuote } from "@/app/actions/shop";
import type { QuoteRequest, QuoteResult } from "@/lib/orders";

/** Live quote from the server, refreshed (debounced) whenever the request changes. */
export function useQuote(req: QuoteRequest, enabled = true) {
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<{ code: string; detail?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const key = JSON.stringify(req);

  useEffect(() => {
    if (!enabled || req.cart.length === 0) return;
    const id = ++seq.current;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      const r = await getQuote(JSON.parse(key) as QuoteRequest).catch(() => ({ ok: false as const, error: "generic" }));
      if (id !== seq.current) return;
      setBusy(false);
      if (r.ok) {
        setQuote(r.quote);
        setError(null);
      } else setError({ code: r.error, detail: "detail" in r ? r.detail : undefined });
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the request
  }, [key, enabled]);

  return { quote, error, busy };
}
