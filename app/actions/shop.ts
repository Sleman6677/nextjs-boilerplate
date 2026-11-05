"use server";

import { headers } from "next/headers";
import { currentUser, ensureProfile } from "@/lib/auth";
import { getAddress } from "@/lib/account";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { CheckoutError, getOrderForUser, placeOrder, quoteFor, savePaymentRequest, type CartLine, type PaymentMethod, type QuoteResult, type Shipping } from "@/lib/orders";
import { createOrderPaymentLink, payplusMethods, type OnlineMethod } from "@/lib/payplus";

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getQuote(req: { cart: CartLine[]; couponCode?: string; usePoints?: boolean }): Promise<{ ok: true; quote: QuoteResult } | { ok: false; error: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  try {
    return { ok: true, quote: await quoteFor(user.id, req) };
  } catch (e) {
    return { ok: false, error: e instanceof CheckoutError ? e.code : "generic" };
  }
}

export type CheckoutRequest = {
  cart: CartLine[];
  couponCode?: string;
  usePoints?: boolean;
  method: PaymentMethod;
  addressId?: string;
  shipping?: Shipping;
  saveAddress?: boolean;
  lang: string;
};

export type CheckoutResult = { ok: true; number: number; payUrl?: string; paymentError?: boolean } | { ok: false; error: string };

async function paymentLink(user: { id: string; email: string }, orderNumber: number, lang: Locale): Promise<string> {
  const order = await getOrderForUser(user.id, orderNumber);
  if (!order) throw new Error("order_not_found");
  const link = await createOrderPaymentLink({
    orderId: order.id,
    number: order.number,
    total: order.total,
    method: order.paymentMethod as OnlineMethod,
    lang,
    origin: await origin(),
    customer: { name: order.ship.name, email: user.email, phone: order.ship.phone, address: `${order.ship.street}, ${order.ship.city}` },
    // One line with the final amount: PayPlus never sees a mismatch between items and total.
    items: [{ name: `Serag Lashes #${order.number}`, quantity: 1, price: order.total }],
  });
  await savePaymentRequest(order.id, link.pageRequestUid);
  return link.url;
}

export async function checkout(req: CheckoutRequest): Promise<CheckoutResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "auth" };
  const lang: Locale = isLocale(req.lang) ? req.lang : "ar";
  const online = payplusMethods();
  // Card and Apple Pay need PayPlus; Bit falls back to a manual transfer when PayPlus doesn't handle it.
  if ((req.method === "card" || req.method === "apple_pay") && !online.includes(req.method)) return { ok: false, error: "invalid_method" };

  try {
    await ensureProfile(user, lang);
    let shipping = req.shipping;
    if (req.addressId) {
      const a = await getAddress(user.id, req.addressId);
      if (!a) return { ok: false, error: "invalid_shipping" };
      shipping = { name: a.recipient, phone: a.phone, city: a.city, street: a.street, notes: a.notes };
    }
    if (!shipping) return { ok: false, error: "invalid_shipping" };

    const order = await placeOrder({
      userId: user.id,
      cart: req.cart,
      couponCode: req.couponCode,
      usePoints: req.usePoints,
      method: req.method,
      shipping,
      lang,
      saveAddress: !req.addressId && Boolean(req.saveAddress),
    });

    if (req.method !== "cash" && online.includes(req.method as OnlineMethod) && order.total > 0) {
      try {
        return { ok: true, number: order.number, payUrl: await paymentLink(user, order.number, lang) };
      } catch {
        return { ok: true, number: order.number, paymentError: true };
      }
    }
    return { ok: true, number: order.number };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.code };
    console.error("checkout failed", e);
    return { ok: false, error: "generic" };
  }
}

/** New PayPlus link for an order still awaiting payment (from the order page). */
export async function payOrder(number: number, lang: string): Promise<{ ok: true; payUrl: string } | { ok: false }> {
  const user = await currentUser();
  if (!user) return { ok: false };
  const order = await getOrderForUser(user.id, Number(number));
  if (!order || order.status !== "awaiting_payment" || !payplusMethods().includes(order.paymentMethod as OnlineMethod)) return { ok: false };
  try {
    return { ok: true, payUrl: await paymentLink(user, order.number, isLocale(lang) ? lang : "ar") };
  } catch {
    return { ok: false };
  }
}
