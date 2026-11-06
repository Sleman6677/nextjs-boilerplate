import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getStore } from "@/lib/catalog";
import { locales } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site-url";

/** Home, shop, story and every product, in the three languages (with hreflang alternates). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = siteUrl();
  const store = await getStore().catch(() => null);
  const pages = ["", "/shop", "/about", ...(store ? [...store.all.values()].map((p) => `/p/${p.slug}`) : [])];
  return pages.flatMap((path) =>
    locales.map((lang) => ({
      url: `${base}/${lang}${path}`,
      changeFrequency: path.startsWith("/p/") ? ("weekly" as const) : ("daily" as const),
      priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.7,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
    })),
  );
}
