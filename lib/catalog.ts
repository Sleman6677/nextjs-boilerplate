import type postgres from "postgres";
import { cache } from "react";
import { n, sql } from "./db";
import type { Locale } from "./i18n/config";
import { getDictionary } from "./i18n";
import type { LashMap, LashStyle } from "./lash";
import { displayPrice, type OfferRule } from "./pricing";
import { lashBoxes, shop, type LashBox } from "./site";
import { accountsEnabled } from "./supabase/config";

export type L3 = Record<Locale, string>;
export type BoxTone = LashBox["tone"];

export type Variant = { id: string; name: L3; price: number | null; stock: number | null; active: boolean };

export type Product = {
  id: string;
  slug: string;
  categoryId: string | null;
  kind: "standard" | "gift_card";
  name: L3;
  description: L3;
  price: number; // list price (or the lowest option price)
  salePrice: number | null; // only while the sale is running
  saleEndsAt: string | null;
  imageUrl: string | null; // first photo
  images: string[];
  art: { style: LashStyle; map: LashMap; tone: BoxTone };
  variants: Variant[];
  optionsLabel: L3;
  stock: number | null;
  lowStockThreshold: number;
  sellWhenOut: boolean;
  featured: boolean;
  active: boolean;
  createdAt: string;
  // computed
  displayPrice: number; // what one unit costs today (sale or 1-item offer)
  offerId: string | null;
  rating: { avg: number; count: number } | null;
  sold: number;
};

export type Category = { id: string; slug: string; name: L3; description: L3; imageUrl: string | null; products: Product[] };
export type OfferInfo = OfferRule & { name: L3; endsAt: string | null };
export type Review = { id: string; rating: number; body: string; imageUrl: string | null; author: string; createdAt: string };
export type Addon = { product: Product; specialPrice: number };

const STYLES: LashStyle[] = ["natural", "classic", "hybrid", "volume", "mega", "wet", "lift"];
const MAPS: LashMap[] = ["natural", "cat", "doll", "squirrel"];
const TONES: BoxTone[] = ["petal", "rose", "blush", "berry"];
const pick = <T extends string>(value: unknown, allowed: T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);

type Row = Record<string, unknown>;
export const l3 = (row: Row, field: string): L3 => ({ ar: String(row[`${field}_ar`] ?? ""), he: String(row[`${field}_he`] ?? ""), en: String(row[`${field}_en`] ?? "") });
const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : null);

function saleNow(row: Row): number | null {
  if (row.sale_price === null || row.sale_price === undefined) return null;
  const now = Date.now();
  if (row.sale_starts_at && new Date(String(row.sale_starts_at)).getTime() > now) return null;
  if (row.sale_ends_at && new Date(String(row.sale_ends_at)).getTime() <= now) return null;
  return n(row.sale_price);
}

/** Base product fields from a products row (photos, options and prices are added by hydrate). */
export function productFromRow(row: Row): Product {
  const price = n(row.price);
  return {
    id: String(row.id),
    slug: String(row.slug),
    categoryId: row.category_id ? String(row.category_id) : null,
    kind: row.kind === "gift_card" ? "gift_card" : "standard",
    name: l3(row, "name"),
    description: l3(row, "description"),
    price,
    salePrice: saleNow(row),
    saleEndsAt: iso(row.sale_ends_at),
    imageUrl: row.image_url ? String(row.image_url) : null,
    images: row.image_url ? [String(row.image_url)] : [],
    art: { style: pick(row.art_style, STYLES, "classic"), map: pick(row.art_map, MAPS, "natural"), tone: pick(row.art_tone, TONES, "petal") },
    variants: [],
    optionsLabel: l3(row, "options_label"),
    stock: row.stock === null || row.stock === undefined ? null : Number(row.stock),
    lowStockThreshold: Number(row.low_stock_threshold ?? 3),
    sellWhenOut: Boolean(row.sell_when_out),
    featured: Boolean(row.featured),
    active: row.active === undefined ? true : Boolean(row.active),
    createdAt: iso(row.created_at) ?? new Date(0).toISOString(),
    displayPrice: price,
    offerId: null,
    rating: null,
    sold: 0,
  };
}

export async function activeOffers(db: postgres.Sql | postgres.TransactionSql = sql()): Promise<OfferInfo[]> {
  const rows = await db`
    select * from offers
    where active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
    order by created_at`;
  return rows.map((o) => ({
    id: String(o.id),
    label: String(o.name_ar),
    name: l3(o, "name"),
    kind: o.kind as OfferRule["kind"],
    value: n(o.value),
    scope: o.scope as OfferRule["scope"],
    productIds: (o.product_ids as string[]).map(String),
    categoryIds: (o.category_ids as string[]).map(String),
    minQty: Number(o.min_qty),
    endsAt: iso(o.ends_at),
  }));
}

/** Adds photos, options, ratings, sales counts and today's price. */
async function hydrate(products: Product[], offers: OfferInfo[], db = sql()): Promise<Product[]> {
  if (products.length === 0) return products;
  const ids = products.map((p) => p.id);
  const [images, variants, ratings, sold] = await Promise.all([
    db`select product_id, url from product_images where product_id in ${db(ids)} order by sort, created_at`,
    db`select * from product_variants where product_id in ${db(ids)} order by sort, name_ar`,
    db`select product_id, avg(rating)::float as avg, count(*)::int as c from reviews where status = 'approved' and product_id in ${db(ids)} group by product_id`,
    db`select i.product_id, sum(i.quantity)::int as q from order_items i join orders o on o.id = i.order_id
       where o.status not in ('cancelled', 'awaiting_payment') and i.product_id in ${db(ids)} group by i.product_id`,
  ]);
  const by = <T,>(rows: Row[], key: string, map: (r: Row) => T) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const k = String(r[key]);
      m.set(k, [...(m.get(k) ?? []), map(r)]);
    }
    return m;
  };
  const imgs = by(images, "product_id", (r) => String(r.url));
  const vars = by(variants, "product_id", (r): Variant => ({ id: String(r.id), name: l3(r, "name"), price: r.price === null ? null : n(r.price), stock: r.stock === null ? null : Number(r.stock), active: Boolean(r.active) }));
  const rate = new Map(ratings.map((r) => [String(r.product_id), { avg: Math.round(Number(r.avg) * 10) / 10, count: Number(r.c) }]));
  const sales = new Map(sold.map((r) => [String(r.product_id), Number(r.q)]));

  return products.map((p) => {
    const photos = imgs.get(p.id) ?? [];
    const images = photos.length ? photos : p.images;
    const v = vars.get(p.id) ?? [];
    const activeV = v.filter((x) => x.active);
    const prices = activeV.map((x) => x.price ?? p.price);
    const listPrice = prices.length ? Math.min(...prices) : p.price;
    const dp = displayPrice({ productId: p.id, categoryId: p.categoryId, listPrice, salePrice: p.salePrice, giftCard: p.kind === "gift_card" }, offers);
    return { ...p, images, imageUrl: images[0] ?? null, variants: v, price: listPrice, displayPrice: dp.price, offerId: dp.offer?.id ?? null, rating: rate.get(p.id) ?? null, sold: sales.get(p.id) ?? 0 };
  });
}

/* ───────────── Fallback before the database is connected ───────────── */

function staticStore(): Store {
  const dicts = { ar: getDictionary("ar"), he: getDictionary("he"), en: getDictionary("en") };
  const products: Product[] = lashBoxes.map((b, i) => ({
    ...productFromRow({ id: b.id, slug: b.id, price: shop.boxPrice, art_style: b.style, art_map: b.map, art_tone: b.tone, created_at: new Date(2026, 0, i + 1) }),
    categoryId: "daily",
    name: { ar: dicts.ar.shop.boxes[b.id].name, he: dicts.he.shop.boxes[b.id].name, en: dicts.en.shop.boxes[b.id].name },
    description: { ar: dicts.ar.shop.boxes[b.id].look, he: dicts.he.shop.boxes[b.id].look, en: dicts.en.shop.boxes[b.id].look },
  }));
  const empty = { ar: "", he: "", en: "" };
  return { categories: [{ id: "daily", slug: "daily", name: empty, description: empty, imageUrl: null, products }], giftCards: [], offers: [], all: new Map(products.map((p) => [p.id, p])) };
}

/* ───────────── Store queries ───────────── */

export type Store = { categories: Category[]; giftCards: Product[]; offers: OfferInfo[]; all: Map<string, Product> };

/** Everything the storefront shows, loaded once per request. Empty or hidden groups are left out. */
export const getStore = cache(async (): Promise<Store> => {
  if (!accountsEnabled()) return staticStore();
  const db = sql();
  const [cats, prods, offers] = await Promise.all([
    db`select * from categories where active order by sort, name_en`,
    db`select * from products where active order by sort, created_at`,
    activeOffers(db),
  ]);
  const products = await hydrate(prods.map(productFromRow), offers, db);
  const categories = cats
    .map((c) => ({ id: String(c.id), slug: String(c.slug), name: l3(c, "name"), description: l3(c, "description"), imageUrl: c.image_url ? String(c.image_url) : null, products: products.filter((p) => p.kind === "standard" && p.categoryId === String(c.id)) }))
    .filter((c) => c.products.length > 0);
  const shown = new Set(categories.flatMap((c) => c.products.map((p) => p.id)));
  const giftCards = products.filter((p) => p.kind === "gift_card");
  for (const g of giftCards) shown.add(g.id);
  return { categories, giftCards, offers, all: new Map(products.filter((p) => shown.has(p.id)).map((p) => [p.id, p])) };
});

export async function getCatalog(): Promise<Category[]> {
  return (await getStore()).categories;
}

/** Added in the last 30 days. */
export function isNewProduct(p: Product): boolean {
  return Date.parse(p.createdAt) > Date.now() - 30 * 86400000;
}

export async function getHome() {
  const store = await getStore();
  const products = store.categories.flatMap((c) => c.products);
  const byNew = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const best = [...products].filter((p) => p.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 8);
  const onSale = products.filter((p) => p.displayPrice < p.price).slice(0, 8);
  return { ...store, newArrivals: byNew, bestSellers: best.length >= 2 ? best : [], onSale };
}

export async function getProductBySlug(slug: string): Promise<{ product: Product; addons: Addon[]; related: Product[]; reviews: Review[]; offers: OfferInfo[] } | null> {
  const store = await getStore();
  const product = [...store.all.values()].find((p) => p.slug === slug);
  if (!product) return null;
  let addons: Addon[] = [];
  let reviews: Review[] = [];
  if (accountsEnabled()) {
    const db = sql();
    const [a, r] = await Promise.all([
      db`select addon_id, special_price from product_addons where product_id = ${product.id} order by sort`,
      db`select r.*, p.full_name from reviews r left join profiles p on p.id = r.customer_id
         where r.product_id = ${product.id} and r.status = 'approved' order by r.created_at desc limit 30`,
    ]);
    addons = a.flatMap((x) => {
      const p = store.all.get(String(x.addon_id));
      return p && p.kind === "standard" ? [{ product: p, specialPrice: n(x.special_price) }] : [];
    });
    reviews = r.map((x) => ({
      id: String(x.id),
      rating: Number(x.rating),
      body: String(x.body ?? ""),
      imageUrl: x.image_url ? String(x.image_url) : null,
      author: String(x.full_name ?? "").split(" ")[0] || "",
      createdAt: iso(x.created_at)!,
    }));
  }
  const related = store.categories
    .flatMap((c) => c.products)
    .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
    .slice(0, 4);
  return { product, addons, related, reviews, offers: store.offers };
}

/** Add-on offers for the products in a cart: { mainProductId → [{ product, specialPrice }] }. */
export async function getAddonsFor(productIds: string[]): Promise<Record<string, Addon[]>> {
  if (!accountsEnabled() || productIds.length === 0) return {};
  const store = await getStore();
  const rows = await sql()`select product_id, addon_id, special_price from product_addons where product_id in ${sql()(productIds)} order by sort`;
  const out: Record<string, Addon[]> = {};
  for (const r of rows) {
    const p = store.all.get(String(r.addon_id));
    if (!p || p.kind !== "standard") continue;
    (out[String(r.product_id)] ??= []).push({ product: p, specialPrice: n(r.special_price) });
  }
  return out;
}
