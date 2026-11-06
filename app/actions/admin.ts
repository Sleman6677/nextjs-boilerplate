"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, assertStaff } from "@/lib/auth";
import { notifyGiftCards, notifyOrderReceived, notifyStatusChange } from "@/lib/notify";
import { sql } from "@/lib/db";
import { CheckoutError, markPaid, ORDER_STATUSES, setOrderStatus, type OrderStatus } from "@/lib/orders";
import { supabaseUrl } from "@/lib/supabase/config";

export type FormState = { ok: boolean; error: string | null; at?: number };

const text = (d: FormData, key: string, max = 200) => String(d.get(key) ?? "").trim().slice(0, max);
const number = (d: FormData, key: string): number | null => {
  const raw = text(d, key, 20).replace(",", ".");
  if (raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : NaN;
};
const flag = (d: FormData, key: string) => d.get(key) === "on" || d.get(key) === "true";
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const fail = (error: string): FormState => ({ ok: false, error, at: Date.now() });

/** The shop and cart render per visit, so only the panel itself needs refreshing. */
function refreshStore() {
  revalidatePath("/admin", "layout");
}

/* ───────────── Orders ───────────── */

export async function changeOrderStatus(orderId: string, status: string, note?: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await assertStaff("orders");
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "حالة غير معروفة" };
  let change;
  try {
    change = await setOrderStatus(orderId, status as OrderStatus, { note: note?.trim().slice(0, 300) || undefined, actor: staff.name });
  } catch (e) {
    if (e instanceof CheckoutError && e.code === "order_cancelled") return { ok: false, error: "الطلب ملغي ولا يمكن تغيير حالته." };
    throw e;
  }
  await notifyStatusChange(change);
  revalidatePath("/admin", "layout");
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export async function markOrderPaid(orderId: string): Promise<{ ok: boolean }> {
  const staff = await assertStaff("orders");
  const result = await markPaid(orderId, null, undefined, staff.name);
  if (result?.wasAwaiting) await notifyOrderReceived(orderId);
  if (result?.giftCards.length) await notifyGiftCards(orderId, result.giftCards);
  revalidatePath("/admin", "layout");
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

/* ───────────── Products ───────────── */

const STYLES = ["natural", "classic", "hybrid", "volume", "mega", "wet", "lift"];
const MAPS = ["natural", "cat", "doll", "squirrel"];
const TONES = ["petal", "rose", "blush", "berry"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function saveProduct(_prev: FormState, d: FormData): Promise<FormState> {
  await assertAdmin();
  const id = text(d, "id", 40);
  const p = {
    name_ar: text(d, "name_ar", 80),
    name_he: text(d, "name_he", 80),
    name_en: text(d, "name_en", 80),
    description_ar: text(d, "description_ar", 400),
    description_he: text(d, "description_he", 400),
    description_en: text(d, "description_en", 400),
    price: number(d, "price"),
    category_id: text(d, "category_id", 40),
    image_url: text(d, "image_url", 500),
    art_style: text(d, "art_style", 20),
    art_map: text(d, "art_map", 20),
    art_tone: text(d, "art_tone", 20),
    sort: number(d, "sort") ?? 0,
    active: flag(d, "active"),
  };
  if (!p.name_ar && !p.name_he && !p.name_en) return fail("اسم المنتج مطلوب (بالعربية على الأقل).");
  if (p.price === null || Number.isNaN(p.price) || p.price < 0 || p.price > 100000) return fail("السعر غير صالح.");
  if (!isUuid(p.category_id)) return fail("يجب اختيار مجموعة.");
  if (p.image_url && !/^https?:\/\/\S+$/i.test(p.image_url)) return fail("رابط الصورة يجب أن يبدأ بـ https://");
  if (!STYLES.includes(p.art_style) || !MAPS.includes(p.art_map) || !TONES.includes(p.art_tone)) return fail("اختيار شكل العلبة غير صالح.");
  if (Number.isNaN(p.sort)) return fail("الترتيب يجب أن يكون رقمًا.");

  const db = sql();
  const [cat] = await db`select 1 from categories where id = ${p.category_id}`;
  if (!cat) return fail("المجموعة غير موجودة.");
  const values = {
    category_id: p.category_id,
    name_ar: p.name_ar,
    name_he: p.name_he,
    name_en: p.name_en,
    description_ar: p.description_ar || null,
    description_he: p.description_he || null,
    description_en: p.description_en || null,
    price: Math.round(p.price * 100) / 100,
    image_url: p.image_url || null,
    art_style: p.art_style,
    art_map: p.art_map,
    art_tone: p.art_tone,
    sort: Math.trunc(p.sort),
    active: p.active,
  };

  if (id) {
    if (!isUuid(id)) return fail("منتج غير موجود.");
    const updated = await db`update products set ${db(values)} where id = ${id} returning id`;
    if (updated.length === 0) return fail("منتج غير موجود.");
  } else {
    const base = slugify(p.name_en) || "product";
    const [taken] = await db`select 1 from products where slug = ${base}`;
    const slug = taken ? `${base}-${randomUUID().slice(0, 6)}` : base;
    await db`insert into products ${db({ ...values, slug })}`;
  }
  refreshStore();
  redirect("/admin/products?saved=1");
}

export async function setProductActive(id: string, active: boolean): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await sql()`update products set active = ${active} where id = ${id}`;
  refreshStore();
}

export async function deleteProduct(id: string): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  // Past orders keep their own copy of the name and price.
  await sql()`delete from products where id = ${id}`;
  refreshStore();
  redirect("/admin/products?deleted=1");
}

/** Uploads a product photo to Supabase Storage (needs SUPABASE_SERVICE_ROLE_KEY). */
export async function uploadProductImage(d: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await assertAdmin();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const url = supabaseUrl();
  if (!key || !url) return { ok: false, error: "رفع الصور غير مفعّل بعد، ويمكن لصق رابط صورة بدلًا من ذلك." };
  const file = d.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "لم يتم اختيار صورة." };
  if (file.size > 3 * 1024 * 1024) return { ok: false, error: "الصورة كبيرة جدًا (الحد ٣ ميغابايت)." };
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[file.type];
  if (!ext) return { ok: false, error: "الصيغ المقبولة: JPG أو PNG أو WEBP." };

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const bucket = "products";
  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  let { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error && /not found/i.test(error.message)) {
    await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: "3MB", allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] });
    ({ error } = await supabase.storage.from(bucket).upload(path, body, { contentType: file.type, cacheControl: "31536000", upsert: false }));
  }
  if (error) {
    console.error("product image upload failed", error.message);
    return { ok: false, error: "تعذّر رفع الصورة. يُرجى المحاولة مرة أخرى." };
  }
  return { ok: true, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl };
}

/* ───────────── Categories ───────────── */

export async function saveCategory(_prev: FormState, d: FormData): Promise<FormState> {
  await assertAdmin();
  const id = text(d, "id", 40);
  const c = {
    name_ar: text(d, "name_ar", 60),
    name_he: text(d, "name_he", 60),
    name_en: text(d, "name_en", 60),
    description_ar: text(d, "description_ar", 200) || null,
    description_he: text(d, "description_he", 200) || null,
    description_en: text(d, "description_en", 200) || null,
    sort: number(d, "sort") ?? 0,
    active: flag(d, "active"),
  };
  if (!c.name_ar && !c.name_he && !c.name_en) return fail("اسم المجموعة مطلوب.");
  if (Number.isNaN(c.sort)) return fail("الترتيب يجب أن يكون رقمًا.");
  const values = { ...c, sort: Math.trunc(c.sort) };
  const db = sql();
  if (id) {
    if (!isUuid(id)) return fail("مجموعة غير موجودة.");
    await db`update categories set ${db(values)} where id = ${id}`;
  } else {
    const base = slugify(c.name_en) || "group";
    const [taken] = await db`select 1 from categories where slug = ${base}`;
    await db`insert into categories ${db({ ...values, slug: taken ? `${base}-${randomUUID().slice(0, 6)}` : base })}`;
  }
  refreshStore();
  return { ok: true, error: null, at: Date.now() };
}

/* ───────────── Coupons ───────────── */

/** "2026-12-31" (Israel time) → timestamptz; start of day for starts, end of day for ends. */
function israelDay(value: string, end: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value} ${end ? "23:59:59" : "00:00:00"} Asia/Jerusalem`;
}

export async function saveCoupon(_prev: FormState, d: FormData): Promise<FormState> {
  await assertAdmin();
  const id = text(d, "id", 40);
  const code = text(d, "code", 32).toUpperCase().replace(/\s+/g, "");
  const kind = text(d, "kind", 10);
  const value = number(d, "value");
  const minSubtotal = number(d, "min_subtotal") ?? 0;
  const maxUses = number(d, "max_uses");
  const startsAt = text(d, "starts_at", 10);
  const endsAt = text(d, "ends_at", 10);

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return fail("الرمز: ٣ أحرف على الأقل، أحرف إنجليزية وأرقام فقط.");
  if (kind !== "percent" && kind !== "fixed") return fail("نوع الخصم مطلوب.");
  if (value === null || Number.isNaN(value) || value <= 0) return fail("قيمة الخصم مطلوبة.");
  if (kind === "percent" && value > 100) return fail("النسبة لا تتجاوز ١٠٠٪.");
  if (Number.isNaN(minSubtotal) || minSubtotal < 0) return fail("الحد الأدنى للطلب غير صالح.");
  if (maxUses !== null && (Number.isNaN(maxUses) || maxUses < 1)) return fail("عدد مرات الاستعمال غير صالح.");
  if (startsAt && endsAt && startsAt > endsAt) return fail("تاريخ الانتهاء قبل تاريخ البداية.");

  const values = {
    code,
    kind,
    value: Math.round(value * 100) / 100,
    min_subtotal: Math.round(minSubtotal * 100) / 100,
    max_uses: maxUses === null ? null : Math.trunc(maxUses),
    starts_at: israelDay(startsAt, false),
    ends_at: israelDay(endsAt, true),
    once_per_customer: flag(d, "once_per_customer"),
    active: flag(d, "active"),
  };
  const db = sql();
  const [clash] = await db`select id from coupons where code = ${code} and id::text <> ${id || ""}`;
  if (clash) return fail("هذا الرمز مستعمل لكوبون آخر.");
  if (id) {
    if (!isUuid(id)) return fail("كوبون غير موجود.");
    await db`update coupons set ${db(values)} where id = ${id}`;
  } else {
    await db`insert into coupons ${db(values)}`;
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/coupons?saved=1");
}

export async function setCouponActive(id: string, active: boolean): Promise<void> {
  await assertAdmin();
  if (!isUuid(id)) return;
  await sql()`update coupons set active = ${active} where id = ${id}`;
  revalidatePath("/admin", "layout");
}

export async function deleteCoupon(id: string): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  if (!isUuid(id)) return { ok: false };
  const [used] = await sql()`select 1 from coupon_redemptions where coupon_id = ${id} limit 1`;
  if (used) return { ok: false, error: "استُعمل هذا الكوبون في طلبات، لذلك يمكن إيقافه فقط." };
  await sql()`delete from coupons where id = ${id}`;
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/* ───────────── Settings ───────────── */

export async function saveSettings(_prev: FormState, d: FormData): Promise<FormState> {
  await assertAdmin();
  const shippingFee = number(d, "shipping_fee");
  const freeOn = flag(d, "free_shipping");
  const threshold = number(d, "free_shipping_threshold");
  const firstPct = number(d, "first_order_discount_pct") ?? 0;
  const earnPct = number(d, "points_earn_pct") ?? 0;
  const pointValue = number(d, "point_value");

  if (shippingFee === null || Number.isNaN(shippingFee) || shippingFee < 0) return fail("سعر التوصيل غير صالح.");
  if (freeOn && (threshold === null || Number.isNaN(threshold) || threshold < 0)) return fail("المبلغ الذي يصبح بعده التوصيل مجانيًا مطلوب.");
  if (Number.isNaN(firstPct) || firstPct < 0 || firstPct > 100) return fail("نسبة خصم الطلب الأول بين ٠ و١٠٠.");
  if (Number.isNaN(earnPct) || earnPct < 0 || earnPct > 100) return fail("نسبة النقاط بين ٠ و١٠٠.");
  if (pointValue === null || Number.isNaN(pointValue) || pointValue <= 0) return fail("قيمة النقطة يجب أن تكون أكبر من صفر.");

  await sql()`
    update settings set
      shipping_fee = ${shippingFee},
      free_shipping_threshold = ${freeOn ? threshold : null},
      first_order_discount_pct = ${firstPct},
      points_earn_pct = ${earnPct},
      point_value = ${pointValue},
      updated_at = now()
    where id = 1`;
  refreshStore();
  return { ok: true, error: null, at: Date.now() };
}

/* ───────────── Customers ───────────── */

export async function adjustPoints(_prev: FormState, d: FormData): Promise<FormState> {
  await assertAdmin();
  const userId = text(d, "user_id", 40);
  const delta = number(d, "delta");
  if (!isUuid(userId)) return fail("الحساب غير موجود.");
  if (delta === null || Number.isNaN(delta) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) return fail("عدد النقاط يجب أن يكون رقمًا صحيحًا، مثل 50 أو ‎-20.");
  const ok = await sql().begin(async (tx) => {
    const [p] = await tx`select id from profiles where id = ${userId} for update`;
    if (!p) return false;
    const [{ balance }] = await tx`select coalesce(sum(delta), 0)::int as balance from points_ledger where user_id = ${userId}`;
    if (Number(balance) + delta < 0) return false;
    await tx`insert into points_ledger (user_id, delta, reason) values (${userId}, ${delta}, 'adjust')`;
    return true;
  });
  if (!ok) return fail("الرصيد لا يمكن أن يصبح أقل من صفر.");
  revalidatePath("/admin", "layout");
  revalidatePath("/[lang]/account", "layout");
  return { ok: true, error: null, at: Date.now() };
}
