import { cache } from "react";
import type { L3 } from "./catalog";
import { getSettings } from "./orders";
import { normalizePhone } from "./phone";
import { site } from "./site";
import { accountsEnabled } from "./supabase/config";

export type StoreInfo = {
  instagram: string;
  tiktok: string;
  whatsapp: string; // international digits, e.g. 972537725568
  announcement: L3 | null;
  freeShippingThreshold: number | null;
  giftCardBonusPct: number;
};

const handle = (v: string | null | undefined, fallback: string) => (v ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\/@?/i, "").replace(/\/.*$/, "") || fallback;

/** Social accounts and store-wide notices: set in the panel, with the code values as fallback. */
export const getStoreInfo = cache(async (): Promise<StoreInfo> => {
  const s = accountsEnabled() ? await getSettings().catch(() => null) : null;
  const wa = s?.whatsapp ? normalizePhone(s.whatsapp) : null;
  return {
    instagram: handle(s?.instagram, site.instagram),
    tiktok: handle(s?.tiktok, site.tiktok),
    whatsapp: wa ? wa.slice(1) : site.whatsapp,
    announcement: s && (s.announcement.ar || s.announcement.he || s.announcement.en) ? s.announcement : null,
    freeShippingThreshold: s ? s.freeShippingThreshold : null,
    giftCardBonusPct: s?.giftCardBonusPct ?? 10,
  };
});
