"use client";

import { useSyncExternalStore } from "react";

/* Small localStorage-backed stores shared across pages and tabs. */

function store<T>(key: string, empty: T, valid: (v: unknown) => T) {
  let cache: T | null = null;
  const listeners = new Set<() => void>();
  const read = (): T => {
    if (cache !== null) return cache;
    try {
      cache = valid(JSON.parse(localStorage.getItem(key) ?? "null"));
    } catch {
      cache = empty;
    }
    return cache;
  };
  const write = (next: T) => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable: still works for this page view */
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };
  const use = () => useSyncExternalStore(subscribe, read, () => empty);
  return { read, write, use };
}

/* ───────────── Cart ───────────── */

export type CartItem = { id: string; variantId: string | null; qty: number };
export const lineKey = (i: { id: string; variantId?: string | null }) => `${i.id}:${i.variantId ?? ""}`;

const EMPTY: CartItem[] = [];
const items = store<CartItem[]>("serag-cart", EMPTY, (v) =>
  Array.isArray(v) ? v.filter((i) => typeof i?.id === "string" && Number.isInteger(i?.qty) && i.qty > 0).map((i) => ({ id: i.id, variantId: typeof i.variantId === "string" ? i.variantId : null, qty: Math.min(50, i.qty) })) : EMPTY,
);

export const cart = {
  add(id: string, variantId: string | null = null, qty = 1) {
    const list = items.read();
    const k = lineKey({ id, variantId });
    const found = list.find((i) => lineKey(i) === k);
    items.write(found ? list.map((i) => (lineKey(i) === k ? { ...i, qty: Math.min(50, i.qty + qty) } : i)) : [...list, { id, variantId, qty: Math.min(50, qty) }]);
  },
  set(key: string, qty: number) {
    items.write(qty <= 0 ? items.read().filter((i) => lineKey(i) !== key) : items.read().map((i) => (lineKey(i) === key ? { ...i, qty: Math.min(50, qty) } : i)));
  },
  remove(key: string) {
    items.write(items.read().filter((i) => lineKey(i) !== key));
  },
  replace(next: CartItem[]) {
    items.write(next);
  },
  clear() {
    items.write([]);
    extras.write(EMPTY_EXTRAS);
  },
};

export const useCart = items.use;

export function useCartCount(): number {
  return useCart().reduce((sum, i) => sum + i.qty, 0);
}

/* ───────────── Cart choices kept between the cart and checkout ───────────── */

export type CartExtras = { couponCode: string; giftCardCode: string; usePoints: boolean; note: string; zoneId: string };
const EMPTY_EXTRAS: CartExtras = { couponCode: "", giftCardCode: "", usePoints: false, note: "", zoneId: "" };
const extras = store<CartExtras>("serag-cart-extras", EMPTY_EXTRAS, (v) => {
  const o = (v ?? {}) as Partial<CartExtras>;
  return {
    couponCode: typeof o.couponCode === "string" ? o.couponCode.slice(0, 32) : "",
    giftCardCode: typeof o.giftCardCode === "string" ? o.giftCardCode.slice(0, 20) : "",
    usePoints: o.usePoints === true,
    note: typeof o.note === "string" ? o.note.slice(0, 500) : "",
    zoneId: typeof o.zoneId === "string" ? o.zoneId : "",
  };
});

export const cartExtras = {
  set(patch: Partial<CartExtras>) {
    extras.write({ ...extras.read(), ...patch });
  },
};
export const useCartExtras = extras.use;

/* ───────────── Favorites on this device (merged into the account after sign-in) ───────────── */

const NO_FAVS: string[] = [];
const favs = store<string[]>("serag-favs", NO_FAVS, (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 100) : NO_FAVS));

export const localFavorites = {
  toggle(id: string): boolean {
    const list = favs.read();
    const on = !list.includes(id);
    favs.write(on ? [id, ...list] : list.filter((x) => x !== id));
    return on;
  },
  replace(ids: string[]) {
    favs.write(ids);
  },
  read: favs.read,
};
export const useLocalFavorites = favs.use;
