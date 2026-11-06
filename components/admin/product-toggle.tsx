"use client";

import { useOptimistic, useTransition } from "react";
import { setProductActive } from "@/app/actions/admin-catalog";

export function ProductToggle({ id, active, name }: { id: string; active: boolean; name: string }) {
  const [shown, setShown] = useOptimistic(active);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={shown}
      aria-label={`عرض ${name} في المتجر`}
      onClick={() =>
        start(async () => {
          setShown(!shown);
          await setProductActive(id, !shown);
        })
      }
      className="flex min-h-11 items-center gap-2 text-xs text-taupe"
    >
      <span className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${shown ? "bg-gold-deep" : "bg-cocoa/20"}`} aria-hidden="true">
        <span className={`absolute top-0.5 start-0.5 h-5 w-5 rounded-full bg-ivory shadow transition-transform duration-200 ${shown ? "-translate-x-5" : ""}`} />
      </span>
      <span className="w-12 text-start">{shown ? "معروض" : "مخفي"}</span>
    </button>
  );
}
