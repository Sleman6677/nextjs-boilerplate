"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { isMobile, normalizePhone } from "@/lib/phone";
import { uploadPublicImage } from "@/lib/storage";

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function saveProfile(input: { fullName: string; email: string; birthday: string; lang: string; marketingConsent: boolean }): Promise<{ ok: boolean; error?: "email" | "email_taken" | "birthday" }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  const lang = isLocale(input.lang) ? input.lang : "ar";
  const email = clean(input.email, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "email" };
  const birthday = clean(input.birthday, 10);
  if (birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || Number.isNaN(Date.parse(birthday)) || birthday > new Date().toISOString().slice(0, 10) || birthday < "1920-01-01")) return { ok: false, error: "birthday" };
  const db = sql();
  if (email) {
    const [taken] = await db`select 1 from profiles where lower(email) = ${email} and id <> ${user.id}`;
    if (taken) return { ok: false, error: "email_taken" };
  }
  await db`
    update profiles set full_name = ${clean(input.fullName, 80) || null}, email = ${email || null}, preferred_lang = ${lang},
      birthday = ${birthday || null},
      marketing_consent = ${Boolean(input.marketingConsent)},
      marketing_consent_at = case when ${Boolean(input.marketingConsent)} and not marketing_consent then now() else marketing_consent_at end
    where id = ${user.id}`;
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export type AddressInput = { id?: string; label: string; recipient: string; phone: string; city: string; street: string; notes: string; isDefault: boolean };

export async function saveAddress(input: AddressInput): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const a = {
    label: clean(input.label, 40) || null,
    recipient: clean(input.recipient, 80),
    phone: clean(input.phone, 30),
    city: clean(input.city, 80),
    street: clean(input.street, 160),
    notes: clean(input.notes, 300) || null,
  };
  if (a.recipient.length < 2 || a.phone.replace(/\D/g, "").length < 7 || a.city.length < 2 || a.street.length < 2) return { ok: false, error: "required" };

  await sql().begin(async (tx) => {
    const [{ c }] = await tx`select count(*)::int as c from addresses where user_id = ${user.id}`;
    const makeDefault = Boolean(input.isDefault) || Number(c) === 0;
    if (makeDefault) await tx`update addresses set is_default = false where user_id = ${user.id}`;
    if (input.id) {
      await tx`update addresses set label = ${a.label}, recipient = ${a.recipient}, phone = ${a.phone}, city = ${a.city}, street = ${a.street}, notes = ${a.notes},
        is_default = case when ${makeDefault} then true else is_default end where id = ${input.id} and user_id = ${user.id}`;
    } else {
      await tx`insert into addresses (user_id, label, recipient, phone, city, street, notes, is_default)
        values (${user.id}, ${a.label}, ${a.recipient}, ${a.phone}, ${a.city}, ${a.street}, ${a.notes}, ${makeDefault})`;
    }
  });
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  await sql().begin(async (tx) => {
    const [deleted] = await tx`delete from addresses where id = ${id} and user_id = ${user.id} returning is_default`;
    if (deleted?.is_default) {
      await tx`update addresses set is_default = true where id = (select id from addresses where user_id = ${user.id} order by created_at desc limit 1)`;
    }
  });
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<{ ok: boolean }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  await sql().begin(async (tx) => {
    const [own] = await tx`select 1 from addresses where id = ${id} and user_id = ${user.id}`;
    if (!own) return;
    await tx`update addresses set is_default = (id = ${id}) where user_id = ${user.id}`;
  });
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

/* ───────────── Favorites ───────────── */

export async function toggleFavorite(productId: string): Promise<{ ok: boolean; on?: boolean; auth?: false }> {
  const user = await currentUser();
  if (!user) return { ok: false, auth: false };
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { ok: false };
  const db = sql();
  const removed = await db`delete from favorites where customer_id = ${user.id} and product_id = ${productId} returning 1`;
  if (removed.length === 0) await db`insert into favorites (customer_id, product_id) select ${user.id}, id from products where id = ${productId} on conflict do nothing`;
  revalidatePath("/[lang]/account", "layout");
  return { ok: true, on: removed.length === 0 };
}

/** Favorites saved on this device before signing in; returns the account's list when signed in. */
export async function mergeFavorites(ids: string[]): Promise<{ signedIn: boolean; ids: string[] }> {
  const user = await currentUser();
  if (!user) return { signedIn: false, ids: [] };
  const valid = (Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
  const db = sql();
  if (valid.length) await db`insert into favorites (customer_id, product_id) select ${user.id}, id from products where id in ${db(valid)} on conflict do nothing`;
  const rows = await db`select product_id from favorites where customer_id = ${user.id} order by created_at desc`;
  return { signedIn: true, ids: rows.map((r) => String(r.product_id)) };
}

/* ───────────── Back-in-stock alerts ───────────── */

export async function requestStockAlert(input: { productId: string; variantId?: string | null; phone: string; lang: string }): Promise<{ ok: boolean; error?: "phone" }> {
  const phone = normalizePhone(input.phone);
  if (!isMobile(phone)) return { ok: false, error: "phone" };
  if (!/^[0-9a-f-]{36}$/i.test(input.productId) || (input.variantId && !/^[0-9a-f-]{36}$/i.test(input.variantId))) return { ok: false };
  const user = await currentUser();
  await sql()`
    insert into stock_alerts (product_id, variant_id, phone_norm, customer_id, lang)
    select ${input.productId}, ${input.variantId ?? null}, ${phone}, ${user?.id ?? null}, ${isLocale(input.lang) ? input.lang : "ar"}
    where exists (select 1 from products where id = ${input.productId})
    on conflict do nothing`;
  return { ok: true };
}

/* ───────────── Reviews ───────────── */

export async function submitReview(d: FormData): Promise<{ ok: boolean; error?: "auth" | "not_allowed" | "rating" | "image" }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const productId = String(d.get("productId") ?? "");
  const rating = Math.round(Number(d.get("rating")));
  const body = clean(d.get("body"), 1000);
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { ok: false, error: "not_allowed" };
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "rating" };
  const db = sql();
  const [order] = await db`
    select o.id from orders o join order_items i on i.order_id = o.id
    where o.user_id = ${user.id} and o.status = 'delivered' and i.product_id = ${productId}
    order by o.created_at desc limit 1`;
  if (!order) return { ok: false, error: "not_allowed" };
  let imageUrl: string | null = null;
  const file = d.get("image");
  if (file instanceof File && file.size > 0) {
    const up = await uploadPublicImage(file, "reviews");
    if (!up.ok) return { ok: false, error: "image" };
    imageUrl = up.url;
  }
  await db`
    insert into reviews (product_id, customer_id, order_id, rating, body, image_url)
    values (${productId}, ${user.id}, ${order.id as string}, ${rating}, ${body || null}, ${imageUrl})
    on conflict (product_id, order_id) do update set rating = excluded.rating, body = excluded.body, image_url = coalesce(excluded.image_url, reviews.image_url), status = 'pending'`;
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

/* ───────────── Saved cart (abandoned-cart reminders) ───────────── */

export async function syncCart(items: { id: string; variantId?: string | null; qty: number }[], lang: string): Promise<void> {
  const user = await currentUser();
  if (!user) return;
  const rows = (Array.isArray(items) ? items : [])
    .filter((i) => typeof i?.id === "string" && /^[0-9a-f-]{36}$/i.test(i.id) && Number(i.qty) >= 1)
    .slice(0, 60)
    .map((i) => ({ id: i.id, variantId: i.variantId ?? null, qty: Math.min(50, Math.floor(Number(i.qty))) }));
  await sql()`
    insert into carts (customer_id, items, lang, updated_at, reminded_at, recovered_order_id)
    values (${user.id}, ${sql().json(rows as never)}, ${isLocale(lang) ? lang : "ar"}, now(), null, null)
    on conflict (customer_id) do update set items = excluded.items, lang = excluded.lang, updated_at = now(),
      reminded_at = case when excluded.items::text = carts.items::text then carts.reminded_at else null end,
      recovered_order_id = null`;
}

/* ───────────── Marketing opt-out ───────────── */

export async function unsubscribe(token: string): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false };
  const rows = await sql()`update profiles set marketing_consent = false where unsubscribe_token = ${token} returning id`;
  return { ok: rows.length > 0 };
}
