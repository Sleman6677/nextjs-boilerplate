"use server";

import { cookies, headers } from "next/headers";
import { getAddress } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { lowStockAlert } from "@/lib/automations";
import { notifyGiftCards, notifyOrderReceived } from "@/lib/notify";
import { checkOrderToken, orderPath } from "@/lib/order-link";
import { CheckoutError, getOrderById, getOrderByNumber, placeOrder, quoteFor, savePaymentRequest, type CartLine, type PaymentMethod, type QuoteRequest, type QuoteResult } from "@/lib/orders";
import { createOrderPaymentLink, payplusMethods, type OnlineMethod } from "@/lib/payplus";
import { attributionFrom, ATTRIBUTION_COOKIE } from "@/lib/attribution";

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getQuote(req: QuoteRequest): Promise<{ ok: true; quote: QuoteResult } | { ok: false; error: string; detail?: string }> {
  const user = await currentUser();
  try {
    return { ok: true, quote: await quoteFor(user?.id ?? null, req) };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.code, detail: e.detail };
    console.error("quote failed", e);
    return { ok: false, error: "generic" };
  }
}

export type CheckoutRequest = {
  cart: CartLine[];
  couponCode?: string;
  giftCardCode?: string;
  usePoints?: boolean;
  method: PaymentMethod;
  zoneId?: string | null;
  contact: { name: string; phone: string; email?: string };
  addressId?: string;
  address?: { city: string; street: string; notes?: string };
  saveAddress?: boolean;
  note?: string;
  birthday?: string;
  marketingConsent?: boolean;
  lang: string;
};

export type CheckoutResult = { ok: true; number: number; orderPath: string; payUrl?: string; paymentError?: boolean } | { ok: false; error: string; detail?: string };

async function paymentLink(orderId: string, lang: Locale): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("order_not_found");
  const link = await createOrderPaymentLink({
    orderId: order.id,
    number: order.number,
    total: order.total,
    method: order.paymentMethod as OnlineMethod,
    lang,
    origin: await origin(),
    returnPath: orderPath(lang, order.number, order.id),
    customer: { name: order.ship.name, email: order.userEmail ?? null, phone: order.ship.phone, address: [order.ship.street, order.ship.city].filter(Boolean).join(", ") },
    // One line with the final amount: PayPlus never sees a mismatch between items and total.
    items: [{ name: `Serag Lashes #${order.number}`, quantity: 1, price: order.total }],
  });
  await savePaymentRequest(order.id, link.pageRequestUid);
  return link.url;
}

/** Guest checkout: the customer account is created (or found) by phone number. */
export async function checkout(req: CheckoutRequest): Promise<CheckoutResult> {
  const user = await currentUser();
  const lang: Locale = isLocale(req.lang) ? req.lang : "ar";
  const online = payplusMethods();
  // Card and Apple Pay need PayPlus; Bit falls back to a manual transfer when PayPlus doesn't handle it.
  if ((req.method === "card" || req.method === "apple_pay") && !online.includes(req.method)) return { ok: false, error: "invalid_method" };

  try {
    let address = req.address ?? null;
    if (req.addressId && user) {
      const a = await getAddress(user.id, req.addressId);
      if (!a) return { ok: false, error: "invalid_shipping" };
      address = { city: a.city, street: a.street, notes: a.notes };
    }
    const attribution = attributionFrom((await cookies()).get(ATTRIBUTION_COOKIE)?.value);

    const order = await placeOrder({
      signedInId: user?.id ?? null,
      cart: req.cart,
      couponCode: req.couponCode,
      giftCardCode: req.giftCardCode,
      usePoints: req.usePoints,
      method: req.method,
      zoneId: req.zoneId,
      contact: req.contact,
      address,
      note: req.note,
      birthday: req.birthday,
      marketingConsent: req.marketingConsent,
      saveAddress: Boolean(user) && !req.addressId && Boolean(req.saveAddress),
      source: attribution.source,
      campaign: attribution.campaign,
      lang,
    });
    const path = orderPath(lang, order.number, order.id);
    await lowStockAlert(order.id);

    if (!order.paid && req.method !== "cash" && online.includes(req.method as OnlineMethod)) {
      try {
        return { ok: true, number: order.number, orderPath: path, payUrl: await paymentLink(order.id, lang) };
      } catch {
        return { ok: true, number: order.number, orderPath: path, paymentError: true };
      }
    }
    await notifyOrderReceived(order.id);
    if (order.paid) {
      const detail = await getOrderById(order.id);
      if (detail?.giftCards.length) await notifyGiftCards(order.id, detail.giftCards.map((g) => ({ code: g.code.replace(/-/g, ""), value: g.value, expiresAt: g.expiresAt })));
    }
    return { ok: true, number: order.number, orderPath: path };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.code, detail: e.detail };
    console.error("checkout failed", e);
    return { ok: false, error: "generic" };
  }
}

/** New PayPlus link for an order still awaiting payment (order page; signed-in owner or the link token). */
export async function payOrder(number: number, token: string | null, lang: string): Promise<{ ok: true; payUrl: string } | { ok: false }> {
  const order = await getOrderByNumber(Number(number));
  if (!order) return { ok: false };
  const user = await currentUser();
  if (!(user && user.id === order.userId) && !checkOrderToken(order.id, token)) return { ok: false };
  if (order.status !== "awaiting_payment" || !payplusMethods().includes(order.paymentMethod as OnlineMethod)) return { ok: false };
  try {
    return { ok: true, payUrl: await paymentLink(order.id, isLocale(lang) ? lang : "ar") };
  } catch {
    return { ok: false };
  }
}
