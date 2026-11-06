import { sql } from "./db";
import type { Locale } from "./i18n/config";
import { isMobile, normalizePhone } from "./phone";
import { siteUrl } from "./site-url";
import { sendSms, smsConfigured } from "./sms";

/** Every message the store sends. Order updates are transactional; the rest need marketing consent. */
export const TEMPLATES = {
  login_code: { kind: "transactional", label: "رمز الدخول", vars: ["code"] },
  order_received: { kind: "transactional", label: "تأكيد الطلب", vars: ["name", "number", "total", "link"] },
  order_preparing: { kind: "transactional", label: "قيد التجهيز", vars: ["number"] },
  order_shipped: { kind: "transactional", label: "تم الشحن", vars: ["number", "tracking"] },
  order_out_for_delivery: { kind: "transactional", label: "في الطريق", vars: ["number"] },
  order_delivered: { kind: "transactional", label: "تم التسليم", vars: ["number", "link"] },
  points_earned: { kind: "transactional", label: "إضافة النقاط", vars: ["points", "balance"] },
  gift_card: { kind: "transactional", label: "كود بطاقة الهدية", vars: ["value", "code", "expires", "site"] },
  birthday: { kind: "marketing", label: "خصم عيد الميلاد", vars: ["name", "discount", "code", "expires", "site"] },
  back_in_stock: { kind: "transactional", label: "عودة منتج للمخزون", vars: ["product", "link"] },
  favorite_sale: { kind: "marketing", label: "خصم على منتج في المفضلة", vars: ["product", "price", "link"] },
  abandoned_cart: { kind: "marketing", label: "تذكير بالسلة", vars: ["link", "coupon"] },
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

// Israeli law (חוק התקשורת, סעיף 30א) requires marketing texts to be labelled and to offer opt-out.
const AD_PREFIX: Record<Locale, string> = { ar: "פרסומת | إعلان: ", he: "פרסומת: ", en: "פרסומת | Ad: " };
const OPT_OUT: Record<Locale, string> = { ar: "لإلغاء الاشتراك: ", he: "להסרה: ", en: "Unsubscribe: " };

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : "")).replace(/\s{2,}/g, " ").trim();
}

async function templateBody(key: string, lang: Locale): Promise<string | null> {
  const rows = await sql()`select lang, body, enabled from message_templates where key = ${key} and lang in (${lang}, 'ar') `;
  const own = rows.find((r) => r.lang === lang) ?? rows.find((r) => r.lang === "ar");
  if (!own || !own.enabled) return null;
  return String(own.body);
}

export type SendInput = {
  phone: string;
  template: TemplateKey;
  lang: Locale;
  vars: Record<string, string | number>;
  customerId?: string | null;
  orderId?: string | null;
  /** Marketing messages may also be composed by hand from the panel. */
  body?: string;
  kind?: "transactional" | "marketing";
};

export type SendResult = { status: "sent" | "queued" | "failed" | "skipped"; error?: string };

/**
 * Renders, logs and sends one SMS. Without an SMS account the message is kept as "queued" so
 * staff can send it from the panel. Login codes are sent but never stored.
 */
export async function sendMessage(m: SendInput): Promise<SendResult> {
  const phone = normalizePhone(m.phone);
  if (!isMobile(phone)) return { status: "skipped", error: "not_mobile" };
  const kind = m.kind ?? TEMPLATES[m.template].kind;
  const db = sql();

  let customer: Record<string, unknown> | undefined;
  if (m.customerId) [customer] = await db`select id, marketing_consent, unsubscribe_token from profiles where id = ${m.customerId}`;
  else [customer] = await db`select id, marketing_consent, unsubscribe_token from profiles where phone_norm = ${phone}`;

  if (kind === "marketing" && !customer?.marketing_consent) return { status: "skipped", error: "no_consent" };

  let body = m.body ?? (await templateBody(m.template, m.lang));
  if (!body) return { status: "skipped", error: "disabled" };
  body = fill(body, m.vars);
  if (kind === "marketing") body = `${AD_PREFIX[m.lang]}${body} ${OPT_OUT[m.lang]}${siteUrl()}/${m.lang}/unsubscribe?t=${customer?.unsubscribe_token ?? ""}`;

  if (m.template === "login_code") {
    const r = await sendSms(phone, body);
    return r.ok ? { status: "sent" } : { status: "failed", error: r.error };
  }

  const [row] = await db`
    insert into messages (customer_id, phone_norm, kind, template, body, status, order_id)
    values (${(customer?.id as string | undefined) ?? null}, ${phone}, ${kind}, ${m.template}, ${body}, 'queued', ${m.orderId ?? null})
    returning id`;
  if (!smsConfigured()) return { status: "queued" };
  const r = await sendSms(phone, body);
  await db`update messages set status = ${r.ok ? "sent" : "failed"}, provider_ref = ${r.ok ? r.ref : null}, error = ${r.ok ? null : r.error}, sent_at = ${r.ok ? new Date() : null} where id = ${row.id as string}`;
  return r.ok ? { status: "sent" } : { status: "failed", error: r.error };
}

/** Never let a notification problem break an order or a status change. */
export async function safely(task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (e) {
    console.error("notification failed", e instanceof Error ? e.message : e);
  }
}
