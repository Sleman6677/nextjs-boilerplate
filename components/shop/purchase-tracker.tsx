"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/track";

/** Purchase event after returning from the PayPlus page (cash orders are tracked at checkout). */
export function PurchaseTracker({ number, total, items }: { number: number; total: number; items: { id: string; name: string; price: number; quantity: number }[] }) {
  useEffect(() => {
    const key = `serag-tracked-${number}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable: track anyway */
    }
    trackPurchase(number, items, total);
  }, [number, total, items]);
  return null;
}
