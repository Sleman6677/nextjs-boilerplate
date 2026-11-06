import { l3, type L3 } from "./catalog";
import { n, sql } from "./db";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : null);

export type ProductEdit = {
  id?: string;
  kind: "standard" | "gift_card";
  name: L3;
  description: L3;
  optionsLabel: L3;
  price: number | "";
  salePrice: number | "";
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  categoryId: string;
  images: string[];
  art: { style: string; map: string; tone: string };
  stock: number | "";
  lowStockThreshold: number;
  sellWhenOut: boolean;
  featured: boolean;
  sort: number;
  active: boolean;
  variants: { id?: string; name: L3; price: number | ""; stock: number | ""; active: boolean }[];
  addons: { addonId: string; specialPrice: number | "" }[];
};

export async function productForEdit(id: string): Promise<ProductEdit | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = sql();
  const [p] = await db`select * from products where id = ${id}`;
  if (!p) return null;
  const [images, variants, addons] = await Promise.all([
    db`select url from product_images where product_id = ${id} order by sort, created_at`,
    db`select * from product_variants where product_id = ${id} order by sort, name_ar`,
    db`select addon_id, special_price from product_addons where product_id = ${id} order by sort`,
  ]);
  const imgs = images.map((r) => String(r.url));
  return {
    id,
    kind: p.kind === "gift_card" ? "gift_card" : "standard",
    name: l3(p, "name"),
    description: l3(p, "description"),
    optionsLabel: l3(p, "options_label"),
    price: n(p.price),
    salePrice: p.sale_price === null ? "" : n(p.sale_price),
    saleStartsAt: iso(p.sale_starts_at),
    saleEndsAt: iso(p.sale_ends_at),
    categoryId: p.category_id ? String(p.category_id) : "",
    images: imgs.length ? imgs : p.image_url ? [String(p.image_url)] : [],
    art: { style: String(p.art_style), map: String(p.art_map), tone: String(p.art_tone) },
    stock: p.stock === null ? "" : Number(p.stock),
    lowStockThreshold: Number(p.low_stock_threshold),
    sellWhenOut: Boolean(p.sell_when_out),
    featured: Boolean(p.featured),
    sort: Number(p.sort),
    active: Boolean(p.active),
    variants: variants.map((v) => ({ id: String(v.id), name: l3(v, "name"), price: v.price === null ? "" : n(v.price), stock: v.stock === null ? "" : Number(v.stock), active: Boolean(v.active) })),
    addons: addons.map((a) => ({ addonId: String(a.addon_id), specialPrice: n(a.special_price) })),
  };
}

export type InventoryRow = {
  productId: string;
  variantId: string | null;
  name: string;
  variant: string | null;
  stock: number | null;
  threshold: number;
  sold: number;
  sellWhenOut: boolean;
  active: boolean;
};

/** Stock per product/option with units sold (cancelled and unpaid orders excluded). */
export async function inventory(): Promise<InventoryRow[]> {
  const rows = await sql()`
    select p.id as product_id, v.id as variant_id, p.name_ar, v.name_ar as variant_name,
      case when v.id is not null then v.stock else p.stock end as stock,
      p.low_stock_threshold, p.sell_when_out, p.active and coalesce(v.active, true) as active,
      (select coalesce(sum(i.quantity), 0) from order_items i join orders o on o.id = i.order_id
        where o.status not in ('cancelled', 'awaiting_payment') and i.product_id = p.id and (v.id is null or i.variant_id = v.id))::int as sold
    from products p left join product_variants v on v.product_id = p.id
    where p.kind = 'standard'
    order by p.sort, p.created_at, v.sort`;
  return rows.map((r) => ({
    productId: String(r.product_id),
    variantId: r.variant_id ? String(r.variant_id) : null,
    name: String(r.name_ar),
    variant: (r.variant_name as string | null) ?? null,
    stock: r.stock === null ? null : Number(r.stock),
    threshold: Number(r.low_stock_threshold),
    sold: Number(r.sold),
    sellWhenOut: Boolean(r.sell_when_out),
    active: Boolean(r.active),
  }));
}

export type ReviewRow = { id: string; product: string; productId: string; customer: string; phone: string; rating: number; body: string; imageUrl: string | null; status: string; createdAt: string; orderNumber: number };

export async function reviewsList(status: string): Promise<ReviewRow[]> {
  const db = sql();
  const rows = await db`
    select r.*, p.name_ar, pr.full_name, pr.phone_norm, o.number from reviews r
    join products p on p.id = r.product_id join profiles pr on pr.id = r.customer_id join orders o on o.id = r.order_id
    where ${status === "all" ? db`true` : db`r.status = ${status}`}
    order by r.created_at desc limit 300`;
  return rows.map((r: Row) => ({
    id: String(r.id),
    product: String(r.name_ar),
    productId: String(r.product_id),
    customer: String(r.full_name ?? ""),
    phone: String(r.phone_norm ?? ""),
    rating: Number(r.rating),
    body: String(r.body ?? ""),
    imageUrl: (r.image_url as string | null) ?? null,
    status: String(r.status),
    createdAt: iso(r.created_at)!,
    orderNumber: Number(r.number),
  }));
}
