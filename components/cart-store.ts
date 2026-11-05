"use client";

import { useSyncExternalStore } from "react";

/** The shopping cart, kept in localStorage and shared across pages and tabs. */
export type CartItem = { id: string; qty: number };

const KEY = "serag-cart";
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((i) => typeof i?.id === "string" && Number.isInteger(i?.qty) && i.qty > 0) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(next: CartItem[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the cart still works for this page view */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  add(id: string, qty = 1) {
    const items = read();
    const found = items.find((i) => i.id === id);
    write(found ? items.map((i) => (i.id === id ? { ...i, qty: Math.min(50, i.qty + qty) } : i)) : [...items, { id, qty }]);
  },
  set(id: string, qty: number) {
    write(qty <= 0 ? read().filter((i) => i.id !== id) : read().map((i) => (i.id === id ? { ...i, qty: Math.min(50, qty) } : i)));
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((sum, i) => sum + i.qty, 0);
}
