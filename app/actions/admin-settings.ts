"use server";

import { revalidatePath } from "next/cache";
import { assertStaff, audit, PERMISSIONS } from "@/lib/auth";
import { sql } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
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
const fail = (error: string): FormState => ({ ok: false, error, at: Date.now() });
const done = (): FormState => ({ ok: true, error: null, at: Date.now() });
const bad = (v: number | null, min: number, max: number) => v === null || Number.isNaN(v) || v < min || v > max;

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/[lang]", "layout");
}

export async function saveSettings(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("settings");
  const shippingFee = number(d, "shipping_fee");
  const freeOn = flag(d, "free_shipping");
  const threshold = number(d, "free_shipping_threshold");
  const firstPct = number(d, "first_order_discount_pct") ?? 0;
  const earnPct = number(d, "points_earn_pct") ?? 0;
  const pointValue = number(d, "point_value");
  const expiryOn = flag(d, "points_expire");
  const expiryMonths = number(d, "points_expiry_months");
  const giftBonus = number(d, "gift_card_bonus_pct") ?? 0;
  const giftMonths = number(d, "gift_card_valid_months");
  const bdayValue = number(d, "birthday_value");
  const bdayDays = number(d, "birthday_valid_days");
  const cartHours = number(d, "abandoned_cart_hours");
  const unpaidHours = number(d, "unpaid_cancel_hours");

  if (bad(shippingFee, 0, 10000)) return fail("سعر التوصيل غير صالح.");
  if (freeOn && bad(threshold, 0, 100000)) return fail("المبلغ الذي يصبح بعده التوصيل مجانيًا مطلوب.");
  if (bad(firstPct, 0, 100)) return fail("نسبة خصم الطلب الأول بين ٠ و١٠٠.");
  if (bad(earnPct, 0, 100)) return fail("نسبة النقاط بين ٠ و١٠٠.");
  if (bad(pointValue, 0.01, 1000)) return fail("قيمة النقطة يجب أن تكون أكبر من صفر.");
  if (expiryOn && (bad(expiryMonths, 1, 120) || !Number.isInteger(expiryMonths))) return fail("مدة صلاحية النقاط بالأشهر (1–120).");
  if (bad(giftBonus, 0, 100)) return fail("زيادة بطاقة الهدية بين ٠ و١٠٠٪.");
  if (giftMonths !== null && (bad(giftMonths, 1, 120) || !Number.isInteger(giftMonths))) return fail("صلاحية بطاقة الهدية بالأشهر (1–120)، أو فارغة بلا انتهاء.");
  if (bad(bdayValue, 0.01, 10000)) return fail("قيمة خصم عيد الميلاد غير صالحة.");
  if (text(d, "birthday_kind", 10) !== "fixed" && (bdayValue ?? 0) > 100) return fail("نسبة خصم عيد الميلاد لا تتجاوز ١٠٠٪.");
  if (bad(bdayDays, 1, 365)) return fail("صلاحية خصم عيد الميلاد بالأيام (1–365).");
  if (bad(cartHours, 1, 336)) return fail("تذكير السلة بعد 1 إلى 336 ساعة.");
  if (bad(unpaidHours, 1, 720)) return fail("إلغاء الطلبات غير المدفوعة بعد 1 إلى 720 ساعة.");
  const ownerPhone = text(d, "owner_phone", 30);
  if (ownerPhone && !normalizePhone(ownerPhone)) return fail("رقم هاتف التنبيهات غير صحيح.");
  const whatsapp = text(d, "whatsapp", 30);
  if (whatsapp && !normalizePhone(whatsapp)) return fail("رقم الواتساب غير صحيح.");

  await sql()`
    update settings set
      shipping_fee = ${shippingFee}, free_shipping_threshold = ${freeOn ? threshold : null},
      first_order_discount_pct = ${firstPct}, points_earn_pct = ${earnPct}, point_value = ${pointValue},
      points_expiry_months = ${expiryOn ? expiryMonths : null},
      gift_card_bonus_pct = ${giftBonus}, gift_card_valid_months = ${giftMonths},
      birthday_enabled = ${flag(d, "birthday_enabled")}, birthday_kind = ${text(d, "birthday_kind", 10) === "fixed" ? "fixed" : "percent"},
      birthday_value = ${bdayValue}, birthday_valid_days = ${bdayDays},
      abandoned_cart_enabled = ${flag(d, "abandoned_cart_enabled")}, abandoned_cart_hours = ${cartHours},
      unpaid_cancel_hours = ${unpaidHours},
      announcement_ar = ${text(d, "announcement_ar", 160) || null}, announcement_he = ${text(d, "announcement_he", 160) || null}, announcement_en = ${text(d, "announcement_en", 160) || null},
      instagram = ${text(d, "instagram", 60) || null}, tiktok = ${text(d, "tiktok", 60) || null}, whatsapp = ${whatsapp || null},
      owner_phone = ${ownerPhone || null},
      invoice_doc_type = ${text(d, "invoice_doc_type", 20) === "inv_receipt" ? "inv_receipt" : "inv_tax_receipt"},
      updated_at = now()
    where id = 1`;
  await audit(staff, "update", "settings", "1");
  refresh();
  return done();
}

/* ───────────── Shipping zones & carriers ───────────── */

export async function saveZone(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("settings");
  const id = text(d, "id", 40);
  const price = number(d, "price");
  const threshold = number(d, "free_threshold");
  const values = {
    name_ar: text(d, "name_ar", 60),
    name_he: text(d, "name_he", 60),
    name_en: text(d, "name_en", 60),
    price,
    free_threshold: threshold,
    is_pickup: flag(d, "is_pickup"),
    active: flag(d, "active"),
    sort: Math.trunc(number(d, "sort") ?? 0) || 0,
  };
  if (!values.name_ar) return fail("اسم المنطقة بالعربية مطلوب.");
  if (bad(price, 0, 10000)) return fail("سعر التوصيل غير صالح.");
  if (threshold !== null && bad(threshold, 0, 100000)) return fail("حد التوصيل المجاني غير صالح.");
  const db = sql();
  if (id && isUuid(id)) await db`update shipping_zones set ${db(values)} where id = ${id}`;
  else await db`insert into shipping_zones ${db(values)}`;
  await audit(staff, id ? "update" : "create", "zone", id || null, { name: values.name_ar, price });
  refresh();
  return done();
}

export async function deleteZone(id: string): Promise<void> {
  const staff = await assertStaff("settings");
  if (!isUuid(id)) return;
  await sql()`delete from shipping_zones where id = ${id}`;
  await audit(staff, "delete", "zone", id);
  refresh();
}

export async function saveCarrier(_prev: FormState, d: FormData): Promise<FormState> {
  const staff = await assertStaff("settings");
  const id = text(d, "id", 40);
  const name = text(d, "name", 60);
  const url = text(d, "tracking_url", 300);
  if (!name) return fail("اسم شركة الشحن مطلوب.");
  if (url && (!/^https?:\/\/\S+$/i.test(url) || !url.includes("{number}"))) return fail("رابط التتبع يجب أن يبدأ بـ https:// ويحتوي على {number}.");
  const db = sql();
  if (id && isUuid(id)) await db`update carriers set name = ${name}, tracking_url = ${url || null}, active = ${flag(d, "active")} where id = ${id}`;
  else await db`insert into carriers (name, tracking_url, active) values (${name}, ${url || null}, ${flag(d, "active")})`;
  await audit(staff, id ? "update" : "create", "carrier", id || null, { name });
  refresh();
  return done();
}

export async function deleteCarrier(id: string): Promise<void> {
  const staff = await assertStaff("settings");
  if (!isUuid(id)) return;
  await sql()`delete from carriers where id = ${id}`;
  await audit(staff, "delete", "carrier", id);
  refresh();
}

/* ───────────── Staff ───────────── */

export async function saveStaff(_prev: FormState, d: FormData): Promise<FormState> {
  const me = await assertStaff("staff");
  const id = text(d, "id", 40);
  const name = text(d, "name", 60);
  const email = text(d, "email", 200).toLowerCase();
  const phoneRaw = text(d, "phone", 30);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const permissions = d.getAll("permissions").map(String).filter((p) => (PERMISSIONS as readonly string[]).includes(p));
  if (!name) return fail("الاسم مطلوب.");
  if (!email && !phone) return fail("رقم الهاتف أو البريد مطلوب للدخول.");
  if (phoneRaw && !phone) return fail("رقم الهاتف غير صحيح.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("البريد غير صحيح.");
  if (permissions.length === 0) return fail("يجب اختيار صلاحية واحدة على الأقل.");
  if (!me.owner && permissions.includes("staff")) return fail("صلاحية «الطاقم» يمنحها صاحب المتجر فقط.");
  const db = sql();
  const [clash] = await db`select 1 from staff where id::text <> ${id || ""} and ((${email || null}::text is not null and lower(email) = ${email || ""}) or (${phone}::text is not null and phone_norm = ${phone ?? ""}))`;
  if (clash) return fail("هذا الرقم أو البريد مستعمل لموظف آخر.");
  const values = { name, email: email || null, phone_norm: phone, active: flag(d, "active") };
  if (id && isUuid(id)) await db`update staff set ${db(values)}, permissions = ${permissions}::text[] where id = ${id}`;
  else await db`insert into staff (name, email, phone_norm, active, permissions) values (${name}, ${values.email}, ${phone}, ${values.active}, ${permissions}::text[])`;
  await audit(me, id ? "update" : "create", "staff", id || null, { name, permissions });
  refresh();
  return done();
}

export async function deleteStaff(id: string): Promise<void> {
  const me = await assertStaff("staff");
  if (!isUuid(id)) return;
  await sql()`delete from staff where id = ${id}`;
  await audit(me, "delete", "staff", id);
  refresh();
}
