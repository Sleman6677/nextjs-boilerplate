"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertStaff, audit } from "@/lib/auth";
import { notifyBackInStock, notifyFavoriteSale } from "@/lib/automations";
import { sql } from "@/lib/db";
import type { ProductEdit } from "@/lib/admin-catalog";
import { uploadPublicImage } from "@/lib/storage";

const STYLES = ["natural", "classic", "hybrid", "volume", "mega", "wet", "lift"];
const MAPS = ["natural", "cat", "doll", "squirrel"];
const TONES = ["petal", "rose", "blush", "berry"];
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const money = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) && x >= 0 && x <= 100000 ? Math.round(x * 100) / 100 : NaN;
};
const int = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isInteger(x) && x >= -100000 && x <= 1000000 ? x : NaN;
};
const day = (v: unknown, end: boolean) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? `${v.slice(0, 10)} ${end ? "23:59:59" : "00:00:00"} Asia/Jerusalem` : null);

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function refresh() {
  revalidatePath("/admin", "layout");
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

/** Saves a product with its photos, options, stock, sale price and add-ons in one go. */
export async function saveProductFull(p: ProductEdit): Promise<SaveResult> {
  const staff = await assertStaff("products");
  const name = { ar: txt(p.name?.ar, 80), he: txt(p.name?.he, 80), en: txt(p.name?.en, 80) };
  const price = money(p.price);
  const salePrice = money(p.salePrice);
  const stock = int(p.stock);
  const threshold = int(p.lowStockThreshold) ?? 3;
  if (!name.ar && !name.he && !name.en) return { ok: false, error: "اسم المنتج مطلوب (بالعربية على الأقل)." };
  if (price === null || Number.isNaN(price)) return { ok: false, error: "السعر غير صالح." };
  if (salePrice !== null && (Number.isNaN(salePrice) || salePrice >= price)) return { ok: false, error: "سعر التخفيض يجب أن يكون أقل من السعر الأصلي." };
  if (Number.isNaN(stock) || Number.isNaN(threshold)) return { ok: false, error: "الكمية يجب أن تكون رقمًا صحيحًا." };
  const kind = p.kind === "gift_card" ? "gift_card" : "standard";
  if (kind === "standard" && !isUuid(p.categoryId)) return { ok: false, error: "يجب اختيار مجموعة." };
  if (!STYLES.includes(p.art?.style) || !MAPS.includes(p.art?.map) || !TONES.includes(p.art?.tone)) return { ok: false, error: "اختيار شكل العلبة غير صالح." };
  const images = (Array.isArray(p.images) ? p.images : []).filter((u) => typeof u === "string" && /^https?:\/\/\S+$/i.test(u)).slice(0, 12);
  const variants = (Array.isArray(p.variants) ? p.variants : []).slice(0, 30).map((v) => ({
    id: isUuid(v.id) ? v.id : null,
    name: { ar: txt(v.name?.ar, 40), he: txt(v.name?.he, 40), en: txt(v.name?.en, 40) },
    price: money(v.price),
    stock: int(v.stock),
    active: v.active !== false,
  }));
  if (variants.some((v) => !v.name.ar || Number.isNaN(v.price) || Number.isNaN(v.stock))) return { ok: false, error: "كل خيار يحتاج اسمًا بالعربية، والسعر والكمية أرقامًا صحيحة." };
  const addons = (Array.isArray(p.addons) ? p.addons : []).filter((a) => isUuid(a.addonId) && a.addonId !== p.id).slice(0, 6).map((a, i) => ({ addonId: a.addonId, price: money(a.specialPrice), sort: i }));
  if (addons.some((a) => a.price === null || Number.isNaN(a.price))) return { ok: false, error: "السعر الخاص مطلوب لكل منتج مرافق." };

  const values = {
    kind,
    category_id: kind === "standard" ? p.categoryId : isUuid(p.categoryId) ? p.categoryId : null,
    name_ar: name.ar,
    name_he: name.he,
    name_en: name.en,
    description_ar: txt(p.description?.ar, 1500) || null,
    description_he: txt(p.description?.he, 1500) || null,
    description_en: txt(p.description?.en, 1500) || null,
    options_label_ar: txt(p.optionsLabel?.ar, 30) || null,
    options_label_he: txt(p.optionsLabel?.he, 30) || null,
    options_label_en: txt(p.optionsLabel?.en, 30) || null,
    price,
    sale_price: salePrice,
    sale_starts_at: salePrice === null ? null : day(p.saleStartsAt, false),
    sale_ends_at: salePrice === null ? null : day(p.saleEndsAt, true),
    image_url: images[0] ?? null,
    art_style: p.art.style,
    art_map: p.art.map,
    art_tone: p.art.tone,
    stock: variants.length ? null : stock,
    low_stock_threshold: Math.max(0, threshold),
    sell_when_out: Boolean(p.sellWhenOut),
    featured: Boolean(p.featured),
    sort: int(p.sort) ?? 0,
    active: Boolean(p.active),
  };

  const db = sql();
  const restocked: { variantId: string | null }[] = [];
  let saleStarted = false;
  const id = await db.begin(async (tx) => {
    let productId = isUuid(p.id) ? p.id : null;
    if (productId) {
      const [before] = await tx`select stock, sale_price from products where id = ${productId} for update`;
      if (!before) throw new Error("not_found");
      if (!variants.length && before.stock !== null && Number(before.stock) <= 0 && (stock === null || stock > 0)) restocked.push({ variantId: null });
      saleStarted = salePrice !== null && before.sale_price === null;
      await tx`update products set ${tx(values)} where id = ${productId}`;
    } else {
      const base = slugify(name.en) || (kind === "gift_card" ? "gift-card" : "product");
      const [taken] = await tx`select 1 from products where slug = ${base}`;
      const [row] = await tx`insert into products ${tx({ ...values, slug: taken ? `${base}-${randomUUID().slice(0, 6)}` : base })} returning id`;
      productId = String(row.id);
    }

    await tx`delete from product_images where product_id = ${productId}`;
    for (const [i, url] of images.entries()) await tx`insert into product_images (product_id, url, sort) values (${productId}, ${url}, ${i})`;

    const keep = variants.filter((v) => v.id).map((v) => v.id as string);
    const old = await tx`select id, stock from product_variants where product_id = ${productId} for update`;
    for (const o of old) if (!keep.includes(String(o.id))) await tx`delete from product_variants where id = ${o.id as string}`;
    for (const [i, v] of variants.entries()) {
      const row = { name_ar: v.name.ar, name_he: v.name.he, name_en: v.name.en, price: v.price, stock: v.stock, active: v.active, sort: i };
      const prev = old.find((o) => String(o.id) === v.id);
      if (v.id && prev) {
        if (prev.stock !== null && Number(prev.stock) <= 0 && (v.stock === null || v.stock > 0)) restocked.push({ variantId: v.id });
        await tx`update product_variants set ${tx(row)} where id = ${v.id}`;
      } else {
        await tx`insert into product_variants ${tx({ ...row, product_id: productId })}`;
      }
    }

    await tx`delete from product_addons where product_id = ${productId}`;
    for (const a of addons) await tx`insert into product_addons (product_id, addon_id, special_price, sort) select ${productId}, id, ${a.price}, ${a.sort} from products where id = ${a.addonId}`;
    return productId;
  });

  await audit(staff, isUuid(p.id) ? "update" : "create", "product", id, { name: name.ar || name.en, price, salePrice, stock: values.stock, variants: variants.length });
  for (const r of restocked) await notifyBackInStock(id, r.variantId);
  if (saleStarted && values.active) await notifyFavoriteSale(id, salePrice!);
  refresh();
  return { ok: true, id };
}

/** Quick stock edit from the inventory page (a restock texts the waiting customers). */
export async function setStock(productId: string, variantId: string | null, stock: number | null): Promise<{ ok: boolean; notified?: number; error?: string }> {
  const staff = await assertStaff("products");
  if (!isUuid(productId) || (variantId !== null && !isUuid(variantId))) return { ok: false };
  if (stock !== null && (!Number.isInteger(stock) || stock < -100000 || stock > 1000000)) return { ok: false, error: "رقم غير صالح" };
  const db = sql();
  const [before] = variantId ? await db`select stock from product_variants where id = ${variantId} and product_id = ${productId}` : await db`select stock from products where id = ${productId}`;
  if (!before) return { ok: false };
  if (variantId) await db`update product_variants set stock = ${stock} where id = ${variantId}`;
  else await db`update products set stock = ${stock} where id = ${productId}`;
  await audit(staff, "stock", "product", productId, { variantId, from: before.stock, to: stock });
  let notified = 0;
  if (before.stock !== null && Number(before.stock) <= 0 && (stock === null || stock > 0)) notified = await notifyBackInStock(productId, variantId);
  // No page refresh: the row stays where it is (it would vanish from a "sold out" filter) and shows the result inline.
  return { ok: true, notified };
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  const staff = await assertStaff("products");
  if (!isUuid(id)) return;
  await sql()`update products set active = ${active} where id = ${id}`;
  await audit(staff, active ? "show" : "hide", "product", id);
  refresh();
}

export async function deleteProduct(id: string): Promise<{ ok: boolean }> {
  const staff = await assertStaff("products");
  if (!isUuid(id)) return { ok: false };
  // Past orders keep their own copy of the name and price.
  await sql()`delete from products where id = ${id}`;
  await audit(staff, "delete", "product", id);
  refresh();
  return { ok: true };
}

export async function uploadImage(d: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await assertStaff("products");
  const file = d.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "لم يتم اختيار صورة." };
  const r = await uploadPublicImage(file, d.get("folder") === "categories" ? "categories" : "products");
  if (r.ok) return r;
  return { ok: false, error: { disabled: "رفع الصور غير مفعّل بعد، ويمكن لصق رابط صورة بدلًا من ذلك.", type: "الصيغ المقبولة: JPG أو PNG أو WEBP.", size: "الصورة كبيرة جدًا (الحد ٣ ميغابايت).", failed: "تعذّر رفع الصورة. يُرجى المحاولة مرة أخرى." }[r.error] };
}

export async function moderateReview(id: string, status: "approved" | "hidden" | "delete"): Promise<void> {
  const staff = await assertStaff("products");
  if (!isUuid(id)) return;
  if (status === "delete") await sql()`delete from reviews where id = ${id}`;
  else await sql()`update reviews set status = ${status} where id = ${id}`;
  await audit(staff, `review_${status}`, "review", id);
  refresh();
}
