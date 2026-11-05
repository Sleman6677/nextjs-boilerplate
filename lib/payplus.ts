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
    return { id: box.id, name: `${box.name} (${box.latin})`, qty, price: shop.boxPrice };
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
export async function createPaymentLink(order: Order, origin: string): Promise<string> {
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
      refURL_success: `${origin}/shop/success`,
      refURL_failure: `${origin}/shop/failure`,
      refURL_cancel: `${origin}/shop`,
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
