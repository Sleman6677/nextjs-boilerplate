"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertStaff, audit } from "@/lib/auth";
import { createPersonalCoupon } from "@/lib/automations";
import { sql } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { safely, sendMessage, TEMPLATES } from "@/lib/messages";
import { normalizeGiftCode } from "@/lib/orders";
import { siteUrl } from "@/lib/site-url";
import { sendSms, smsConfigured } from "@/lib/sms";
import type { FormState } from "./admin";

const text = (d: FormData, key: string, max = 200) => String(d.get(key) ?? "").trim().slice(0, max);
const number = (d: FormData, key: string): number | null => {
  const raw = text(d, key, 20).replace(",", ".");
  if (raw === "") return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : NaN;
};
const flag = (d: FormData, key: string) => d.get(key) === "on" || d.get(key) === "true";
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const ids = (d: FormData, key: string) => d.getAll(key).map(String).filter(isUuid).slice(0, 200);
const fail = (error: string): FormState => ({ ok: false, error, at: Date.now() });
const done = (): FormState => ({ ok: true, error: null, at: Date.now() });
const israelDay = (value: string, end: boolean) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} ${end ? "23:59:59" : "00:00:00"} Asia/Jerusalem` : null);
const langOf = (v: unknown): Locale => (isLocale(String(v)) ? (String(v) as Locale) : "ar");

function refresh() {
  revalidatePath("/admin", "layout");
}

/* ───────────── Coupons ───────────── */

export async function saveCoupon(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("marketing");
  const id = text(d, "id", 40);
  const code = text(d, "code", 32).toUpperCase().replace(/\s+/g, "");
  const kind = text(d, "kind", 10);
  const value = number(d, "value");
  const minSubtotal = number(d, "min_subtotal") ?? 0;
  const maxUses = number(d, "max_uses");
  const startsAt = text(d, "starts_at", 10);
  const endsAt = text(d, "ends_at", 10);
  const scope = ["all", "products", "categories"].includes(text(d, "scope", 12)) ? text(d, "scope", 12) : "all";
  const productIds = scope === "products" ? ids(d, "product_ids") : [];
  const categoryIds = scope === "categories" ? ids(d, "category_ids") : [];

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return fail("الرمز: ٣ أحرف على الأقل، أحرف إنجليزية وأرقام فقط.");
  if (kind !== "percent" && kind !== "fixed") return fail("نوع الخصم مطلوب.");
  if (value === null || Number.isNaN(value) || value <= 0) return fail("قيمة الخصم مطلوبة.");
  if (kind === "percent" && value > 100) return fail("النسبة لا تتجاوز ١٠٠٪.");
  if (Number.isNaN(minSubtotal) || minSubtotal < 0) return fail("الحد الأدنى للطلب غير صالح.");
  if (maxUses !== null && (Number.isNaN(maxUses) || maxUses < 1)) return fail("عدد مرات الاستعمال غير صالح.");
  if (startsAt && endsAt && startsAt > endsAt) return fail("تاريخ الانتهاء قبل تاريخ البداية.");
  if (scope === "products" && productIds.length === 0) return fail("يجب اختيار منتج واحد على الأقل.");
  if (scope === "categories" && categoryIds.length === 0) return fail("يجب اختيار مجموعة واحدة على الأقل.");

  const values = {
    code,
    name: text(d, "name", 80) || null,
    kind,
    value: Math.round(value * 100) / 100,
    min_subtotal: Math.round(minSubtotal * 100) / 100,
    max_uses: maxUses === null ? null : Math.trunc(maxUses),
    starts_at: israelDay(startsAt, false),
    ends_at: israelDay(endsAt, true),
    once_per_customer: flag(d, "once_per_customer"),
    active: flag(d, "active"),
    scope,
    exclude_sale: flag(d, "exclude_sale"),
    source: text(d, "source", 60).toLowerCase() || null,
  };
  const db = sql();
  const [clash] = await db`select id from coupons where code = ${code} and id::text <> ${id || ""}`;
  if (clash) return fail("هذا الرمز مستعمل لكوبون آخر.");
  if (id) {
    if (!isUuid(id)) return fail("كوبون غير موجود.");
    await db`update coupons set ${db(values)}, product_ids = ${productIds}::uuid[], category_ids = ${categoryIds}::uuid[] where id = ${id}`;
  } else {
    await db`insert into coupons ${db({ ...values })}`;
    await db`update coupons set product_ids = ${productIds}::uuid[], category_ids = ${categoryIds}::uuid[] where code = ${code}`;
  }
  await audit(staff, id ? "update" : "create", "coupon", id || code, { code, kind, value: values.value });
  refresh();
  redirect("/admin/coupons?saved=1");
}

export async function setCouponActive(id: string, active: boolean): Promise<void> {
  const staff = await assertStaff("marketing");
  if (!isUuid(id)) return;
  await sql()`update coupons set active = ${active} where id = ${id}`;
  await audit(staff, active ? "enable" : "disable", "coupon", id);
  refresh();
}

export async function deleteCoupon(id: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await assertStaff("marketing");
  if (!isUuid(id)) return { ok: false };
  const [used] = await sql()`select 1 from coupon_redemptions where coupon_id = ${id} limit 1`;
  if (used) return { ok: false, error: "استُعمل هذا الكوبون في طلبات، لذلك يمكن إيقافه فقط." };
  await sql()`delete from coupons where id = ${id}`;
  await audit(staff, "delete", "coupon", id);
  refresh();
  return { ok: true };
}

/* ───────────── Automatic offers ───────────── */

export async function saveOffer(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("marketing");
  const id = text(d, "id", 40);
  const kind = text(d, "kind", 10);
  const value = number(d, "value");
  const minQty = number(d, "min_qty") ?? 1;
  const scope = ["all", "products", "categories"].includes(text(d, "scope", 12)) ? text(d, "scope", 12) : "all";
  const productIds = scope === "products" ? ids(d, "product_ids") : [];
  const categoryIds = scope === "categories" ? ids(d, "category_ids") : [];
  const name = { ar: text(d, "name_ar", 80), he: text(d, "name_he", 80), en: text(d, "name_en", 80) };
  const startsAt = text(d, "starts_at", 10);
  const endsAt = text(d, "ends_at", 10);
  if (!name.ar) return fail("اسم العرض بالعربية مطلوب (يظهر للزبونات).");
  if (kind !== "percent" && kind !== "fixed") return fail("نوع الخصم مطلوب.");
  if (value === null || Number.isNaN(value) || value <= 0 || (kind === "percent" && value > 100)) return fail("قيمة الخصم غير صالحة.");
  if (Number.isNaN(minQty) || !Number.isInteger(minQty) || minQty < 1 || minQty > 100) return fail("الحد الأدنى للكمية بين 1 و100.");
  if (scope === "products" && productIds.length === 0) return fail("يجب اختيار منتج واحد على الأقل.");
  if (scope === "categories" && categoryIds.length === 0) return fail("يجب اختيار مجموعة واحدة على الأقل.");
  if (startsAt && endsAt && startsAt > endsAt) return fail("تاريخ الانتهاء قبل تاريخ البداية.");
  const values = {
    name_ar: name.ar,
    name_he: name.he,
    name_en: name.en,
    kind,
    value: Math.round(value * 100) / 100,
    scope,
    min_qty: minQty,
    starts_at: israelDay(startsAt, false),
    ends_at: israelDay(endsAt, true),
    active: flag(d, "active"),
  };
  const db = sql();
  let offerId = id;
  if (id) {
    if (!isUuid(id)) return fail("العرض غير موجود.");
    await db`update offers set ${db(values)} where id = ${id}`;
  } else {
    const [row] = await db`insert into offers ${db(values)} returning id`;
    offerId = String(row.id);
  }
  await db`update offers set product_ids = ${productIds}::uuid[], category_ids = ${categoryIds}::uuid[] where id = ${offerId}`;
  await audit(staff, id ? "update" : "create", "offer", offerId, { name: name.ar, kind, value });
  refresh();
  redirect("/admin/offers?saved=1");
}

export async function deleteOffer(id: string): Promise<void> {
  const staff = await assertStaff("marketing");
  if (!isUuid(id)) return;
  await sql()`delete from offers where id = ${id}`;
  await audit(staff, "delete", "offer", id);
  refresh();
}

export async function setOfferActive(id: string, active: boolean): Promise<void> {
  const staff = await assertStaff("marketing");
  if (!isUuid(id)) return;
  await sql()`update offers set active = ${active} where id = ${id}`;
  await audit(staff, active ? "enable" : "disable", "offer", id);
  refresh();
}

/* ───────────── Gift cards ───────────── */

export async function setGiftCardDisabled(id: string, disabled: boolean): Promise<void> {
  const staff = await assertStaff("marketing");
  if (!isUuid(id)) return;
  await sql()`update gift_cards set disabled = ${disabled} where id = ${id}`;
  await audit(staff, disabled ? "disable" : "enable", "gift_card", id);
  refresh();
}

/** A gift card made by staff (compensation, giveaway…): no payment, optional SMS to a phone. */
export async function issueGiftCard(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("marketing");
  const value = number(d, "value");
  const months = number(d, "months");
  if (value === null || Number.isNaN(value) || value <= 0 || value > 10000) return fail("القيمة غير صالحة.");
  if (months !== null && (Number.isNaN(months) || months < 1 || months > 60)) return fail("مدة الصلاحية بين 1 و60 شهرًا.");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join("");
  await sql()`
    insert into gift_cards (code, paid_amount, initial_value, balance, expires_at)
    values (${code}, 0, ${value}, ${value}, ${months ? sql()`now() + make_interval(months => ${months})` : null})`;
  await audit(staff, "issue", "gift_card", code, { value });
  const phone = text(d, "phone", 30);
  if (phone) {
    await safely(() => sendMessage({ phone, template: "gift_card", lang: langOf(text(d, "lang", 2)), vars: { value: `${value} ₪`, code: code.replace(/(.{4})(?=.)/g, "$1-"), expires: months ? `${months}m` : "—", site: siteUrl().replace(/^https?:\/\//, "") } }));
  }
  refresh();
  return { ok: true, error: code.replace(/(.{4})(?=.)/g, "$1-"), at: Date.now() };
}

export async function findGiftCardByCode(code: string): Promise<string | null> {
  await assertStaff("marketing");
  const [g] = await sql()`select id from gift_cards where code = ${normalizeGiftCode(code)}`;
  return g ? String(g.id) : null;
}

/* ───────────── Messages ───────────── */

export async function saveTemplate(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("marketing");
  const key = text(d, "key", 40);
  if (!(key in TEMPLATES)) return fail("قالب غير معروف.");
  const db = sql();
  for (const lang of ["ar", "he", "en"] as const) {
    const body = text(d, `body_${lang}`, 600);
    if (!body) return fail("نص الرسالة مطلوب باللغات الثلاث.");
    if (key === "login_code" && !body.includes("{code}")) return fail("رسالة الدخول يجب أن تحتوي على {code}.");
    await db`
      insert into message_templates (key, lang, body, enabled) values (${key}, ${lang}, ${body}, ${flag(d, "enabled") || key === "login_code"})
      on conflict (key, lang) do update set body = excluded.body, enabled = excluded.enabled`;
  }
  await audit(staff, "update", "template", key);
  refresh();
  return done();
}

/** Without an SMS account, staff send queued texts from their own WhatsApp and mark them sent. */
export async function markMessageSent(id: string): Promise<void> {
  await assertStaff("marketing");
  if (!isUuid(id)) return;
  await sql()`update messages set status = 'sent', sent_at = now(), error = 'manual' where id = ${id}`;
  refresh();
}

export async function retryMessage(id: string): Promise<{ ok: boolean; error?: string }> {
  await assertStaff("marketing");
  if (!isUuid(id)) return { ok: false };
  if (!smsConfigured()) return { ok: false, error: "حساب الرسائل غير مربوط بعد." };
  const [m] = await sql()`select * from messages where id = ${id}`;
  if (!m) return { ok: false };
  const r = await sendSms(String(m.phone_norm), String(m.body));
  await sql()`update messages set status = ${r.ok ? "sent" : "failed"}, error = ${r.ok ? null : r.error}, sent_at = ${r.ok ? new Date() : null} where id = ${id}`;
  refresh();
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export type Audience = "all" | "birthday_month" | "bought_product" | "inactive";

/** Marketing text to customers who agreed to receive offers (each gets an opt-out link). */
export async function broadcast(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("marketing");
  const audience = text(d, "audience", 20) as Audience;
  const productId = text(d, "product_id", 40);
  const bodies = { ar: text(d, "body_ar", 500), he: text(d, "body_he", 500), en: text(d, "body_en", 500) };
  if (!bodies.ar) return fail("نص الرسالة بالعربية مطلوب.");
  if (audience === "bought_product" && !isUuid(productId)) return fail("يجب اختيار المنتج.");
  const db = sql();
  const where =
    audience === "birthday_month"
      ? db`and extract(month from p.birthday) = extract(month from now() at time zone 'Asia/Jerusalem')`
      : audience === "bought_product"
        ? db`and exists (select 1 from orders o join order_items i on i.order_id = o.id where o.user_id = p.id and o.status <> 'cancelled' and i.product_id = ${productId})`
        : audience === "inactive"
          ? db`and not exists (select 1 from orders o where o.user_id = p.id and o.created_at > now() - interval '60 days')`
          : db``;
  const people = await db`select id, phone_norm, preferred_lang from profiles p where marketing_consent and phone_norm like '+9725%' ${where} limit 5000`;
  let sent = 0;
  for (const p of people) {
    const lang = langOf(p.preferred_lang);
    const body = bodies[lang] || bodies.ar;
    const r = await sendMessage({ phone: String(p.phone_norm), customerId: String(p.id), template: "favorite_sale", kind: "marketing", lang, vars: {}, body });
    if (r.status === "sent" || r.status === "queued") sent++;
  }
  await audit(staff, "broadcast", "messages", null, { audience, recipients: sent });
  refresh();
  return { ok: true, error: String(sent), at: Date.now() };
}

/* ───────────── Abandoned carts ───────────── */

/** Sends the reminder now, optionally with a personal coupon for this customer. */
export async function remindCart(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("marketing");
  const cartId = text(d, "cart_id", 40);
  const value = number(d, "value");
  if (!isUuid(cartId)) return fail("السلة غير موجودة.");
  const db = sql();
  const [c] = await db`select c.*, p.phone_norm, p.marketing_consent from carts c join profiles p on p.id = c.customer_id where c.id = ${cartId}`;
  if (!c) return fail("السلة غير موجودة.");
  if (!c.marketing_consent) return fail("الزبونة لم توافق على رسائل العروض.");
  let couponCode: string | null = null;
  if (value !== null) {
    if (Number.isNaN(value) || value <= 0 || value > 100) return fail("نسبة الخصم بين 1 و100.");
    couponCode = await createPersonalCoupon({ customerId: String(c.customer_id), prefix: "CART", purpose: "abandoned_cart", kind: "percent", value, validDays: 7, name: "سلة متروكة" });
    await db`update carts set coupon_code = ${couponCode} where id = ${cartId}`;
  }
  const lang = langOf(c.lang);
  const couponText = couponCode ? { ar: `كود خصم لكِ: ${couponCode}`, he: `קוד הנחה בשבילך: ${couponCode}`, en: `Your code: ${couponCode}` }[lang] : "";
  const r = await sendMessage({ phone: String(c.phone_norm), customerId: String(c.customer_id), template: "abandoned_cart", lang, vars: { link: `${siteUrl()}/${lang}/cart`, coupon: couponText } });
  await db`update carts set reminded_at = now() where id = ${cartId}`;
  await audit(staff, "remind", "cart", cartId, { coupon: couponCode });
  refresh();
  return r.status === "failed" ? fail(`لم تُرسل الرسالة: ${r.error ?? ""}`) : done();
}
