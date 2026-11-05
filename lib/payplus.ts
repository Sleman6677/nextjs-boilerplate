/**
 * PayPlus hosted payment page integration (server only — never import from a client component).
 *
 * Docs: https://docs.payplus.co.il/reference/post_paymentpages-generatelink
 *
 * Environment variables (set them in Vercel → Project → Settings → Environment Variables):
 *   PAYPLUS_API_KEY            API key from the PayPlus dashboard
 *   PAYPLUS_SECRET_KEY         Secret key from the PayPlus dashboard
 *   PAYPLUS_PAYMENT_PAGE_UID   UID of the payment page to use
 *   PAYPLUS_ENV                "staging" for test mode; anything else = production
 *   PAYPLUS_API_BASE           optional override of the API base URL (used for local testing)
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { lashBoxes, shop } from "./site";

const BASES = {
  production: "https://restapi.payplus.co.il/api/v1.0",
  staging: "https://restapidev.payplus.co.il/api/v1.0",
};

export function payplusConfigured(): boolean {
  return Boolean(process.env.PAYPLUS_API_KEY && process.env.PAYPLUS_SECRET_KEY && process.env.PAYPLUS_PAYMENT_PAGE_UID);
}

function apiBase(): string {
  if (process.env.PAYPLUS_API_BASE) return process.env.PAYPLUS_API_BASE.replace(/\/$/, "");
  return process.env.PAYPLUS_ENV === "staging" ? BASES.staging : BASES.production;
}

export type OrderInput = {
  items: { id: string; qty: number }[];
  customer: { name: string; phone: string; email: string; address: string; notes?: string };
};

export type Order = {
  ref: string;
  lines: { id: string; name: string; qty: number; price: number }[];
  total: number;
  customer: OrderInput["customer"];
};

export class OrderError extends Error {}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates the cart and recomputes every price on the server; client totals are never trusted. */
export function buildOrder(input: unknown): Order {
  const body = (input ?? {}) as Partial<OrderInput>;
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > lashBoxes.length) {
    throw new OrderError("السلة فارغة أو غير صالحة");
  }

  const seen = new Set<string>();
  const lines = body.items.map((item) => {
    const box = lashBoxes.find((b) => b.id === item?.id);
    const qty = Number(item?.qty);
    if (!box || seen.has(box.id) || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      throw new OrderError("أحد المنتجات في السلة غير صالح");
    }
    seen.add(box.id);
    return { id: box.id, name: box.latin, qty, price: shop.boxPrice };
  });

  const c = (body.customer ?? {}) as Partial<OrderInput["customer"]>;
  const customer = {
    name: clean(c.name, 80),
    phone: clean(c.phone, 30),
    email: clean(c.email, 120),
    address: clean(c.address, 200),
    notes: clean(c.notes, 200),
  };
  if (customer.name.length < 2 || customer.phone.replace(/\D/g, "").length < 7 || customer.address.length < 3) {
    throw new OrderError("بيانات التوصيل غير مكتملة");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    throw new OrderError("البريد الإلكتروني غير صالح");
  }

  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const ref = `SL-${Date.now().toString(36).toUpperCase()}`;
  return { ref, lines, total, customer };
}

/** Asks PayPlus for a one-time payment page for this exact order. Returns the page URL. */
export async function createPaymentLink(order: Order, origin: string, lang = "ar"): Promise<string> {
  const summary = order.lines.map((l) => `${l.name}×${l.qty}`).join("، ");
  const moreInfo = `${order.ref} | ${summary} | ${order.customer.address}${order.customer.notes ? ` | ${order.customer.notes}` : ""}`;

  const res = await fetch(`${apiBase()}/PaymentPages/generateLink`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.PAYPLUS_API_KEY ?? "",
      "secret-key": process.env.PAYPLUS_SECRET_KEY ?? "",
    },
    body: JSON.stringify({
      payment_page_uid: process.env.PAYPLUS_PAYMENT_PAGE_UID,
      amount: order.total,
      currency_code: "ILS",
      charge_method: 1, // J4: immediate charge
      sendEmailApproval: true,
      sendEmailFailure: false,
      refURL_success: `${origin}/${lang}/shop/success`,
      refURL_failure: `${origin}/${lang}/shop/failure`,
      refURL_cancel: `${origin}/${lang}/shop`,
      more_info: moreInfo.slice(0, 250),
      customer: {
        customer_name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address,
      },
      items: order.lines.map((l) => ({ name: l.name, quantity: l.qty, price: l.price })),
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });

  const text = await res.text();
  let data: { results?: { status?: string; description?: string }; data?: { payment_page_link?: string } } = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* non-JSON error body, handled below */
  }

  const link = data.data?.payment_page_link;
  if (!res.ok || data.results?.status !== "success" || !link) {
    // Log for the Vercel function logs; never log the keys.
    console.error("PayPlus generateLink failed", res.status, data.results ?? text.slice(0, 200));
    throw new Error("payment_link_failed");
  }

  const url = new URL(link);
  if (url.protocol !== "https:" || !(url.hostname === "payplus.co.il" || url.hostname.endsWith(".payplus.co.il"))) {
    console.error("PayPlus returned an unexpected payment link host", url.hostname);
    throw new Error("payment_link_failed");
  }
  return url.toString();
}

/* ───────────── Orders from the database ───────────── */


export type OnlineMethod = "card" | "bit" | "apple_pay";

/** Which methods go through the PayPlus page (PAYPLUS_METHODS, default all three). Others fall back. */
export function payplusMethods(): OnlineMethod[] {
  if (!payplusConfigured()) return [];
  const raw = (process.env.PAYPLUS_METHODS ?? "card,bit,apple_pay").split(",").map((m) => m.trim());
  return (["card", "bit", "apple_pay"] as const).filter((m) => raw.includes(m));
}

const CHARGE_DEFAULT: Record<OnlineMethod, string> = { card: "credit-card", bit: "bit", apple_pay: "apple-pay" };

export type PaymentLinkInput = {
  orderId: string;
  number: number;
  total: number;
  method: OnlineMethod;
  lang: string;
  origin: string;
  customer: { name: string; email: string; phone: string; address: string };
  items: { name: string; quantity: number; price: number }[];
};

/** One-time PayPlus page for an order. more_info carries the order id for the callback. */
export async function createOrderPaymentLink(input: PaymentLinkInput): Promise<{ url: string; pageRequestUid: string | null }> {
  const res = await fetch(`${apiBase()}/PaymentPages/generateLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": process.env.PAYPLUS_API_KEY ?? "", "secret-key": process.env.PAYPLUS_SECRET_KEY ?? "" },
    body: JSON.stringify({
      payment_page_uid: process.env.PAYPLUS_PAYMENT_PAGE_UID,
      amount: input.total,
      currency_code: "ILS",
      charge_method: 1,
      charge_default: CHARGE_DEFAULT[input.method],
      sendEmailApproval: true,
      sendEmailFailure: false,
      refURL_success: `${input.origin}/${input.lang}/account/orders/${input.number}?paid=1`,
      refURL_failure: `${input.origin}/${input.lang}/account/orders/${input.number}?failed=1`,
      refURL_cancel: `${input.origin}/${input.lang}/account/orders/${input.number}`,
      refURL_callback: `${input.origin}/api/payplus/callback`,
      more_info: input.orderId,
      more_info_2: `#${input.number}`,
      customer: { customer_name: input.customer.name, email: input.customer.email, phone: input.customer.phone, address: input.customer.address },
      items: input.items,
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const text = await res.text();
  let data: { results?: { status?: string }; data?: { payment_page_link?: string; page_request_uid?: string } } = {};
  try {
    data = JSON.parse(text);
  } catch {
    /* handled below */
  }
  const link = data.data?.payment_page_link;
  if (!res.ok || data.results?.status !== "success" || !link) {
    console.error("PayPlus generateLink failed", res.status, data.results ?? text.slice(0, 200));
    throw new Error("payment_link_failed");
  }
  const url = new URL(link);
  if (url.protocol !== "https:" || !(url.hostname === "payplus.co.il" || url.hostname.endsWith(".payplus.co.il"))) throw new Error("payment_link_failed");
  return { url: url.toString(), pageRequestUid: data.data?.page_request_uid ?? null };
}

/**
 * Verifies a PayPlus callback: HMAC-SHA256 of the body with the secret key, base64, in the
 * "hash" header (docs: validate-requests-received-from-payplus). The docs sign JSON.stringify of
 * the parsed body, so both the raw body and its re-serialised form are accepted.
 */
export function verifyPayplusSignature(rawBody: string, hashHeader: string | null): boolean {
  const secret = process.env.PAYPLUS_SECRET_KEY;
  if (!secret || !hashHeader) return false;
  const candidates = [rawBody];
  try {
    candidates.push(JSON.stringify(JSON.parse(rawBody)));
  } catch {
    return false;
  }
  const given = Buffer.from(hashHeader);
  return candidates.some((message) => {
    const expected = Buffer.from(createHmac("sha256", secret).update(message).digest("base64"));
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}
