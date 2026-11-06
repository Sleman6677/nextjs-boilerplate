"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { mergeFavorites, syncCart, toggleFavorite } from "@/app/actions/account";
import { localFavorites, useCart, useLocalFavorites } from "../cart-store";

type StoreState = { signedIn: boolean; favorites: string[]; toggleFavorite: (id: string) => Promise<boolean> };

const Ctx = createContext<StoreState>({ signedIn: false, favorites: [], toggleFavorite: async () => false });

/**
 * Favorites live on the device and, once signed in, in the account (merged on first load).
 * Signed-in carts are saved too, so a forgotten cart can be followed up.
 */
export function StoreProvider({ lang, enabled, children }: { lang: string; enabled: boolean; children: ReactNode }) {
  const favorites = useLocalFavorites();
  const items = useCart();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    mergeFavorites(localFavorites.read())
      .then((r) => {
        if (!alive || !r.signedIn) return;
        setSignedIn(true);
        localFavorites.replace(r.ids);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled]);

  useEffect(() => {
    if (!signedIn) return;
    const id = window.setTimeout(() => void syncCart(items, lang).catch(() => {}), 1500);
    return () => window.clearTimeout(id);
  }, [items, signedIn, lang]);

  const toggle = useCallback(
    async (id: string) => {
      const on = localFavorites.toggle(id);
      if (signedIn) await toggleFavorite(id).catch(() => {});
      return on;
    },
    [signedIn],
  );

  return <Ctx.Provider value={{ signedIn, favorites, toggleFavorite: toggle }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
