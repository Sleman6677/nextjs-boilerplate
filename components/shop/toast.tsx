"use client";

import { useEffect, useSyncExternalStore } from "react";

type Toast = { id: number; text: string } | null;
let current: Toast = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Shows a short confirmation at the top of the screen ("Added to your cart"). */
export function toast(text: string) {
  current = { id: ++seq, text };
  emit();
}

export function Toaster() {
  const t = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  useEffect(() => {
    if (!t) return;
    const id = window.setTimeout(() => {
      if (current?.id === t.id) {
        current = null;
        emit();
      }
    }, 2600);
    return () => window.clearTimeout(id);
  }, [t]);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex justify-center px-4" aria-live="polite">
      {t ? (
        <p key={t.id} className="slide-up rounded-full bg-plum px-5 py-3 text-sm text-pink-soft shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
          {t.text}
        </p>
      ) : null}
    </div>
  );
}
