import { sql } from "./db";
import { date as fmtDate, money } from "./i18n/format";
import { isLocale, type Locale } from "./i18n/config";
import { safely, sendMessage } from "./messages";
import { orderLink } from "./order-link";
import { formatGiftCode, pointsBalance, type IssuedGiftCard, type StatusChange } from "./orders";
import { siteUrl } from "./site-url";

async function orderInfo(orderId: string) {
  const [o] = await sql()`
    select o.id, o.number, o.total, o.lang, o.ship_name, o.ship_phone, o.user_id, o.tracking_number, o.tracking_url, o.carrier_name, p.phone_norm
    from orders o join profiles p on p.id = o.user_id where o.id = ${orderId}`;
  if (!o) return null;
  const lang: Locale = isLocale(String(o.lang)) ? (String(o.lang) as Locale) : "ar";
  return {
    id: String(o.id),
    number: Number(o.number),
    total: Number(o.total),
    lang,
    name: String(o.ship_name).split(" ")[0],
    phone: String(o.phone_norm ?? o.ship_phone),
    customerId: String(o.user_id),
    tracking: o.tracking_url ? String(o.tracking_url) : o.tracking_number ? `${o.carrier_name ?? ""} ${o.tracking_number}`.trim() : "",
  };
}

export async function notifyGiftCards(orderId: string, cards: IssuedGiftCard[]): Promise<void> {
  if (cards.length === 0) return;
  const o = await orderInfo(orderId);
  if (!o) return;
  for (const c of cards) {
    await safely(() =>
      sendMessage({
        phone: o.phone,
        customerId: o.customerId,
        orderId,
        template: "gift_card",
        lang: o.lang,
        vars: { value: money(c.value, o.lang), code: formatGiftCode(c.code), expires: c.expiresAt ? fmtDate(c.expiresAt, o.lang) : "—", site: siteUrl().replace(/^https?:\/\//, "") },
      }),
    );
  }
}

/** "Thank you, we received order #N" — sent when a cash order is placed or an online payment succeeds. */
export async function notifyOrderReceived(orderId: string): Promise<void> {
  await safely(async () => {
    const o = await orderInfo(orderId);
    if (!o) return;
    await sendMessage({
      phone: o.phone,
      customerId: o.customerId,
      orderId,
      template: "order_received",
      lang: o.lang,
      vars: { name: o.name, number: o.number, total: money(o.total, o.lang), link: orderLink(o.lang, o.number, o.id) },
    });
  });
}

const STATUS_TEMPLATE = {
  preparing: "order_preparing",
  shipped: "order_shipped",
  out_for_delivery: "order_out_for_delivery",
  delivered: "order_delivered",
} as const;

export async function notifyStatusChange(change: StatusChange | null): Promise<void> {
  if (!change) return;
  await safely(async () => {
    const o = await orderInfo(change.orderId);
    if (!o) return;
    const template = STATUS_TEMPLATE[change.to as keyof typeof STATUS_TEMPLATE];
    if (template) {
      await sendMessage({
        phone: o.phone,
        customerId: o.customerId,
        orderId: o.id,
        template,
        lang: o.lang,
        vars: { number: o.number, tracking: o.tracking, link: orderLink(o.lang, o.number, o.id) },
      });
    }
    if (change.pointsAwarded > 0) {
      const balance = await pointsBalance(o.customerId);
      await sendMessage({ phone: o.phone, customerId: o.customerId, orderId: o.id, template: "points_earned", lang: o.lang, vars: { points: change.pointsAwarded, balance } });
    }
  });
  await notifyGiftCards(change.orderId, change.giftCards);
}
