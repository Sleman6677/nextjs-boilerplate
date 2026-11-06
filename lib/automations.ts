import { randomInt } from "node:crypto";
import { sql } from "./db";
import { isLocale, type Locale } from "./i18n/config";
import { date as fmtDate, localized, money, num } from "./i18n/format";
import { safely, sendMessage } from "./messages";
import { cancelStaleUnpaid, expirePoints, getSettings } from "./orders";
import { isMobile, normalizePhone } from "./phone";
import { sendSms } from "./sms";
import { siteUrl } from "./site-url";
import { l3 } from "./catalog";

const langOf = (v: unknown): Locale => (isLocale(String(v)) ? (String(v) as Locale) : "ar");
const CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = (prefix: string) => `${prefix}-${Array.from({ length: 6 }, () => CODE[randomInt(CODE.length)]).join("")}`;

/** Israel's calendar date today, e.g. { month: 11, day: 6, year: 2026 }. */
function israelToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Personal coupon for one customer (birthday, abandoned cart or sent by staff). */
export async function createPersonalCoupon(input: { customerId: string; prefix: string; purpose: "birthday" | "abandoned_cart" | "personal"; kind: "percent" | "fixed"; value: number; validDays: number; name: string }): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const c = code(input.prefix);
    const rows = await sql()`
      insert into coupons (code, name, kind, value, customer_ids, purpose, max_uses, once_per_customer, ends_at, active)
      values (${c}, ${input.name}, ${input.kind}, ${input.value}, array[${input.customerId}]::uuid[], ${input.purpose}, 1, true, now() + make_interval(days => ${input.validDays}), true)
      on conflict (code) do nothing returning code`;
    if (rows.length) return c;
  }
  throw new Error("could not create coupon code");
}

/** Birthday gift: a personal coupon on the day (Feb 29 birthdays get it on Feb 28 in other years). */
export async function runBirthdays(): Promise<number> {
  const s = await getSettings();
  if (!s.birthday.enabled) return 0;
  const { year, month, day } = israelToday();
  const leap = new Date(year, 1, 29).getMonth() === 1;
  const rows = await sql()`
    select id, full_name, phone_norm, preferred_lang from profiles
    where birthday is not null and coalesce(birthday_coupon_year, 0) < ${year}
      and (
        (extract(month from birthday) = ${month} and extract(day from birthday) = ${day})
        or (${!leap && month === 2 && day === 28} and extract(month from birthday) = 2 and extract(day from birthday) = 29)
      )`;
  for (const p of rows) {
    await safely(async () => {
      const lang = langOf(p.preferred_lang);
      const coupon = await createPersonalCoupon({ customerId: String(p.id), prefix: "BDAY", purpose: "birthday", kind: s.birthday.kind, value: s.birthday.value, validDays: s.birthday.validDays, name: "عيد ميلاد" });
      await sql()`update profiles set birthday_coupon_year = ${year} where id = ${p.id as string}`;
      if (p.phone_norm) {
        const until = new Date(Date.now() + s.birthday.validDays * 86400000);
        await sendMessage({
          phone: String(p.phone_norm),
          customerId: String(p.id),
          template: "birthday",
          lang,
          vars: {
            name: String(p.full_name ?? "").split(" ")[0],
            discount: s.birthday.kind === "percent" ? `${num(s.birthday.value, lang)}${lang === "ar" ? "٪" : "%"}` : money(s.birthday.value, lang),
            code: coupon,
            expires: fmtDate(until, lang),
            site: siteUrl().replace(/^https?:\/\//, ""),
          },
        });
      }
    });
  }
  return rows.length;
}

/** Reminds signed-in customers (with marketing consent) about a cart left for a few hours. */
export async function runAbandonedCarts(): Promise<number> {
  const s = await getSettings();
  if (!s.abandonedCart.enabled) return 0;
  const rows = await sql()`
    select c.id, c.customer_id, c.lang, c.coupon_code, p.phone_norm from carts c join profiles p on p.id = c.customer_id
    where jsonb_array_length(c.items) > 0 and c.reminded_at is null and c.recovered_order_id is null
      and c.updated_at < now() - make_interval(hours => ${s.abandonedCart.hours}) and c.updated_at > now() - interval '14 days'
      and p.marketing_consent and p.phone_norm is not null`;
  for (const c of rows) {
    await safely(async () => {
      const lang = langOf(c.lang);
      const couponText = c.coupon_code ? { ar: `كود خصم لكِ: ${c.coupon_code}`, he: `קוד הנחה בשבילך: ${c.coupon_code}`, en: `Your code: ${c.coupon_code}` }[lang] : "";
      await sendMessage({ phone: String(c.phone_norm), customerId: String(c.customer_id), template: "abandoned_cart", lang, vars: { link: `${siteUrl()}/${lang}/cart`, coupon: couponText } });
      await sql()`update carts set reminded_at = now() where id = ${c.id as string}`;
    });
  }
  return rows.length;
}

/** After a restock: texts everyone who asked to be told, and favoriters who agreed to offers. */
export async function notifyBackInStock(productId: string, variantId: string | null = null): Promise<number> {
  const db = sql();
  const [p] = await db`select * from products where id = ${productId} and active`;
  if (!p) return 0;
  const name = l3(p, "name");
  const alerts = await db`
    select id, phone_norm, customer_id, lang from stock_alerts
    where product_id = ${productId} and notified_at is null and (${variantId}::uuid is null or variant_id is null or variant_id = ${variantId})`;
  for (const a of alerts) {
    const lang = langOf(a.lang);
    await safely(() => sendMessage({ phone: String(a.phone_norm), customerId: (a.customer_id as string | null) ?? null, template: "back_in_stock", lang, vars: { product: localized(name, lang), link: `${siteUrl()}/${lang}/p/${p.slug}` } }));
    await db`update stock_alerts set notified_at = now() where id = ${a.id as string}`;
  }
  return alerts.length;
}

/** A favorite went on sale: one text per customer (with consent). */
export async function notifyFavoriteSale(productId: string, price: number): Promise<number> {
  const db = sql();
  const [p] = await db`select * from products where id = ${productId} and active`;
  if (!p) return 0;
  const name = l3(p, "name");
  const fans = await db`
    select pr.id, pr.phone_norm, pr.preferred_lang from favorites f join profiles pr on pr.id = f.customer_id
    where f.product_id = ${productId} and pr.marketing_consent and pr.phone_norm is not null
      and not exists (select 1 from messages m where m.customer_id = pr.id and m.template = 'favorite_sale' and m.created_at > now() - interval '7 days')`;
  for (const f of fans) {
    const lang = langOf(f.preferred_lang);
    await safely(() => sendMessage({ phone: String(f.phone_norm), customerId: String(f.id), template: "favorite_sale", lang, vars: { product: localized(name, lang), price: money(price, lang), link: `${siteUrl()}/${lang}/p/${p.slug}` } }));
  }
  return fans.length;
}

/** Tells the owner (settings → owner phone) when items from this order dropped to the low-stock level. */
export async function lowStockAlert(orderId: string): Promise<void> {
  await safely(async () => {
    const s = await getSettings();
    const phone = normalizePhone(s.ownerPhone);
    if (!isMobile(phone)) return;
    const rows = await sql()`
      select p.name_ar, v.name_ar as variant, coalesce(v.stock, p.stock) as stock, i.quantity, p.low_stock_threshold
      from order_items i join products p on p.id = i.product_id left join product_variants v on v.id = i.variant_id
      where i.order_id = ${orderId} and coalesce(v.stock, p.stock) is not null
        and coalesce(v.stock, p.stock) <= p.low_stock_threshold and coalesce(v.stock, p.stock) + i.quantity > p.low_stock_threshold`;
    if (rows.length === 0) return;
    const list = rows.map((r) => `${r.name_ar}${r.variant ? ` (${r.variant})` : ""}: ${r.stock}`).join("، ");
    await sendSms(phone, `Serag Lashes · مخزون منخفض: ${list}`);
  });
}

/** Everything the daily job does. */
export async function runDaily(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  const step = async (name: string, fn: () => Promise<number>) => {
    try {
      result[name] = await fn();
    } catch (e) {
      console.error(`cron ${name} failed`, e);
      result[name] = -1;
    }
  };
  await step("unpaidCancelled", cancelStaleUnpaid);
  await step("pointsExpired", expirePoints);
  await step("birthdays", runBirthdays);
  await step("abandonedCarts", runAbandonedCarts);
  return result;
}
