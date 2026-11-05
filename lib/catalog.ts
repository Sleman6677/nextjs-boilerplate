import { dbConfigured, n, sql } from "./db";
import type { Locale } from "./i18n/config";
import { getDictionary } from "./i18n";
import type { LashMap, LashStyle } from "./lash";
import { lashBoxes, shop, type LashBox } from "./site";

export type L3 = Record<Locale, string>;
export type BoxTone = LashBox["tone"];

export type Product = {
  id: string;
  slug: string;
  categoryId: string;
  name: L3;
  description: L3;
  price: number;
  imageUrl: string | null;
  art: { style: LashStyle; map: LashMap; tone: BoxTone };
};

export type Category = { id: string; slug: string; name: L3; description: L3; products: Product[] };

const STYLES: LashStyle[] = ["natural", "classic", "hybrid", "volume", "mega", "wet", "lift"];
const MAPS: LashMap[] = ["natural", "cat", "doll", "squirrel"];
const TONES: BoxTone[] = ["petal", "rose", "blush", "berry"];
const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);

type Row = Record<string, unknown>;
const l3 = (row: Row, field: string): L3 => ({ ar: String(row[`${field}_ar`] ?? ""), he: String(row[`${field}_he`] ?? ""), en: String(row[`${field}_en`] ?? "") });

export function productFromRow(row: Row): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    categoryId: String(row.category_id ?? ""),
    name: l3(row, "name"),
    description: l3(row, "description"),
    price: n(row.price),
    imageUrl: row.image_url ? String(row.image_url) : null,
    art: { style: pick(row.art_style, STYLES, "classic"), map: pick(row.art_map, MAPS, "natural"), tone: pick(row.art_tone, TONES, "petal") },
  };
}

/** The six original boxes, used until the database is connected. */
function staticCatalog(): Category[] {
  const dicts = { ar: getDictionary("ar"), he: getDictionary("he"), en: getDictionary("en") };
  const products: Product[] = lashBoxes.map((b) => ({
    id: b.id,
    slug: b.id,
    categoryId: "daily",
    name: { ar: dicts.ar.shop.boxes[b.id].name, he: dicts.he.shop.boxes[b.id].name, en: dicts.en.shop.boxes[b.id].name },
    description: { ar: dicts.ar.shop.boxes[b.id].look, he: dicts.he.shop.boxes[b.id].look, en: dicts.en.shop.boxes[b.id].look },
    price: shop.boxPrice,
    imageUrl: null,
    art: { style: b.style, map: b.map, tone: b.tone },
  }));
  return [{ id: "daily", slug: "daily", name: { ar: "", he: "", en: "" }, description: { ar: "", he: "", en: "" }, products }];
}

/** Active categories (in order) with their active products; empty categories are hidden. */
export async function getCatalog(): Promise<Category[]> {
  if (!dbConfigured()) return staticCatalog();
  const db = sql();
  const [cats, prods] = await Promise.all([
    db`select * from categories where active order by sort, name_en`,
    db`select * from products where active order by sort, created_at`,
  ]);
  const products = prods.map(productFromRow);
  return cats
    .map((c) => ({ id: String(c.id), slug: String(c.slug), name: l3(c, "name"), description: l3(c, "description"), products: products.filter((p) => p.categoryId === String(c.id)) }))
    .filter((c) => c.products.length > 0);
}

/** Active products by id (server-side pricing never trusts client prices). */
export async function getProducts(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  if (!dbConfigured()) return staticCatalog()[0].products.filter((p) => ids.includes(p.id));
  const rows = await sql()`select * from products where active and id::text in ${sql()(ids)}`;
  return rows.map(productFromRow);
}
