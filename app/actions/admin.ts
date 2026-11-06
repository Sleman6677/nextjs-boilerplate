"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { assertStaff, audit } from "@/lib/auth";
import { createPersonalCoupon } from "@/lib/automations";
import { sql } from "@/lib/db";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { money } from "@/lib/i18n/format";
import { safely, sendMessage } from "@/lib/messages";
import { notifyGiftCards, notifyOrderReceived, notifyStatusChange } from "@/lib/notify";
import { CheckoutError, getOrderById, getSettings, markPaid, ORDER_STATUSES, setOrderStatus, setTracking, type OrderStatus } from "@/lib/orders";
import { createCashInvoice, payplusConfigured } from "@/lib/payplus";
import { siteUrl } from "@/lib/site-url";
import { uploadPublicImage } from "@/lib/storage";

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
const done = (): FormState => ({ ok: true, error: null, at: Date.now() });

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function refresh() {
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
  refresh();
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export async function markOrderPaid(orderId: string): Promise<{ ok: boolean }> {
  const staff = await assertStaff("orders");
  const result = await markPaid(orderId, null, undefined, staff.name);
  if (result?.wasAwaiting) await notifyOrderReceived(orderId);
  if (result?.giftCards.length) await notifyGiftCards(orderId, result.giftCards);
  refresh();
  revalidatePath("/[lang]/account", "layout");
  return { ok: true };
}

export async function saveTracking(orderId: string, carrierId: string, trackingNumber: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await assertStaff("orders");
  if (!isUuid(orderId) || (carrierId && !isUuid(carrierId))) return { ok: false };
  await setTracking(orderId, carrierId || null, trackingNumber, staff.name);
  refresh();
  return { ok: true };
}

/** Invoice+ receipt for an order paid in cash or by manual Bit transfer. */
export async function issueInvoice(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await assertStaff("orders");
  if (!payplusConfigured()) return { ok: false, error: "يجب ربط PayPlus أولًا." };
  const o = await getOrderById(orderId);
  if (!o) return { ok: false };
  if (o.invoiceUrl) return { ok: true };
  if (o.paymentStatus !== "paid") return { ok: false, error: "يجب تسجيل الطلب كمدفوع أولًا." };
  try {
    const s = await getSettings();
    const inv = await createCashInvoice({ docType: s.invoiceDocType, number: o.number, total: o.total, lang: o.lang, customer: { name: o.ship.name, phone: o.ship.phone, email: o.userEmail ?? null } });
    await sql()`update orders set invoice_number = ${inv.number}, invoice_url = ${inv.url} where id = ${orderId}`;
    await audit(staff, "invoice", "order", orderId, { number: inv.number });
  } catch {
    return { ok: false, error: "تعذّر إصدار الفاتورة من PayPlus. يجب أن تكون خدمة Invoice+ مفعّلة في الحساب." };
  }
  refresh();
  return { ok: true };
}

/* ───────────── Categories ───────────── */

export async function saveCategory(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("products");
  const id = text(d, "id", 40);
  let imageUrl = text(d, "image_url", 500) || null;
  const file = d.get("image_file");
  if (file instanceof File && file.size > 0) {
    const up = await uploadPublicImage(file, "categories");
    if (!up.ok) return fail("تعذّر رفع الصورة.");
    imageUrl = up.url;
  }
  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) return fail("رابط الصورة يجب أن يبدأ بـ https://");
  const c = {
    name_ar: text(d, "name_ar", 60),
    name_he: text(d, "name_he", 60),
    name_en: text(d, "name_en", 60),
    description_ar: text(d, "description_ar", 200) || null,
    description_he: text(d, "description_he", 200) || null,
    description_en: text(d, "description_en", 200) || null,
    image_url: imageUrl,
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
  await audit(staff, id ? "update" : "create", "category", id || null, { name: c.name_ar });
  refresh();
  return done();
}

/* ───────────── Customers ───────────── */

export async function adjustPoints(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("customers");
  const userId = text(d, "user_id", 40);
  const delta = number(d, "delta");
  if (!isUuid(userId)) return fail("الحساب غير موجود.");
  if (delta === null || Number.isNaN(delta) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) return fail("عدد النقاط يجب أن يكون رقمًا صحيحًا، مثل 50 أو ‎-20.");
  const ok = await sql().begin(async (tx) => {
    const [p] = await tx`select id from profiles where id = ${userId} for update`;
    if (!p) return false;
    const [{ balance }] = await tx`
      select coalesce(sum(delta), 0)::int - coalesce(sum(remaining) filter (where delta > 0 and expires_at is not null and expires_at <= now()), 0)::int as balance
      from points_ledger where user_id = ${userId}`;
    if (Number(balance) + delta < 0) return false;
    if (delta > 0) {
      const s = await getSettings(tx);
      await tx`insert into points_ledger (user_id, delta, reason, remaining, expires_at)
        values (${userId}, ${delta}, 'adjust', ${delta}, ${s.pointsExpiryMonths ? tx`now() + make_interval(months => ${s.pointsExpiryMonths})` : null})`;
    } else {
      await tx`insert into points_ledger (user_id, delta, reason) values (${userId}, ${delta}, 'adjust')`;
      let left = -delta;
      const lots = await tx`select id, remaining from points_ledger where user_id = ${userId} and delta > 0 and remaining > 0 and (expires_at is null or expires_at > now()) order by expires_at nulls last, created_at for update`;
      for (const l of lots) {
        if (left <= 0) break;
        const take = Math.min(left, Number(l.remaining));
        await tx`update points_ledger set remaining = remaining - ${take} where id = ${l.id as number}`;
        left -= take;
      }
    }
    return true;
  });
  if (!ok) return fail("الرصيد لا يمكن أن يصبح أقل من صفر.");
  await audit(staff, "points", "customer", userId, { delta });
  refresh();
  revalidatePath("/[lang]/account", "layout");
  return done();
}

/** Creates a personal coupon for one customer and (optionally) texts it. */
export async function sendPersonalCoupon(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("marketing");
  const userId = text(d, "user_id", 40);
  const kind = text(d, "kind", 10) === "fixed" ? "fixed" : "percent";
  const value = number(d, "value");
  const days = number(d, "days") ?? 14;
  if (!isUuid(userId)) return fail("الحساب غير موجود.");
  if (value === null || Number.isNaN(value) || value <= 0 || (kind === "percent" && value > 100)) return fail("قيمة الخصم غير صالحة.");
  if (Number.isNaN(days) || days < 1 || days > 365) return fail("مدة الصلاحية بين 1 و365 يومًا.");
  const [p] = await sql()`select phone_norm, preferred_lang from profiles where id = ${userId}`;
  if (!p) return fail("الحساب غير موجود.");
  const code = await createPersonalCoupon({ customerId: userId, prefix: "GIFT", purpose: "personal", kind, value, validDays: days, name: "خاص" });
  await audit(staff, "personal_coupon", "customer", userId, { code, kind, value });
  if (flag(d, "send") && p.phone_norm) {
    const lang: Locale = isLocale(String(p.preferred_lang)) ? (String(p.preferred_lang) as Locale) : "ar";
    const disc = kind === "percent" ? `${value}%` : money(value, lang);
    const body = { ar: `هدية لكِ من Serag Lashes: خصم ${disc} بالكود ${code}`, he: `מתנה מ-Serag Lashes: ${disc} הנחה עם הקוד ${code}`, en: `A gift from Serag Lashes: ${disc} off with code ${code}` }[lang];
    await safely(() => sendMessage({ phone: String(p.phone_norm), customerId: userId, template: "birthday", kind: "marketing", lang, vars: {}, body: `${body} ${siteUrl().replace(/^https?:\/\//, "")}` }));
  }
  refresh();
  return { ok: true, error: null, at: Date.now() };
}
