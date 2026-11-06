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

/* ───────────── Orders ───────────── */

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
  /** Order page path with its access token, e.g. /ar/order/1001?t=… */
  returnPath: string;
  customer: { name: string; email?: string | null; phone: string; address: string };
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
      refURL_success: `${input.origin}${input.returnPath}&paid=1`,
      refURL_failure: `${input.origin}${input.returnPath}&failed=1`,
      refURL_cancel: `${input.origin}${input.returnPath}`,
      refURL_callback: `${input.origin}/api/payplus/callback`,
      more_info: input.orderId,
      more_info_2: `#${input.number}`,
      // Invoice+ (if enabled on the payment page) issues the tax document from these details.
      customer: { customer_name: input.customer.name, ...(input.customer.email ? { email: input.customer.email } : {}), phone: input.customer.phone, address: input.customer.address },
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

/**
 * Invoice+ document for an order paid outside PayPlus (cash): POST /books/docs/new/{docType}.
 * Requires the Invoice+ service on the PayPlus account; test on staging first.
 */
export async function createCashInvoice(input: {
  docType: "inv_tax_receipt" | "inv_receipt";
  number: number;
  total: number;
  lang: string;
  customer: { name: string; phone: string; email?: string | null };
}): Promise<{ number: string | null; url: string | null }> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${apiBase()}/books/docs/new/${input.docType}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": process.env.PAYPLUS_API_KEY ?? "", "secret-key": process.env.PAYPLUS_SECRET_KEY ?? "" },
    body: JSON.stringify({
      doc_date: today,
      language: input.lang === "en" ? "en" : "he",
      currency_code: "ILS",
      more_info: `Serag Lashes #${input.number}`,
      unique_identifier: `serag-order-${input.number}`,
      ...(input.docType === "inv_tax_receipt" ? { vatType: "vat-type-included" } : {}),
      customer: { name: input.customer.name, phone: input.customer.phone, ...(input.customer.email ? { email: input.customer.email } : {}), country_ISO: "IL" },
      items: [{ name: `Serag Lashes #${input.number}`, price: input.total, quantity: 1 }],
      payments: [{ payment_type: "cash", amount: input.total, payment_date: today }],
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { number?: string; originalDocAddress?: string; validDocumentGenerated?: boolean };
  if (!res.ok || !(data.number || data.originalDocAddress)) {
    console.error("PayPlus invoice failed", res.status, JSON.stringify(data).slice(0, 300));
    throw new Error("invoice_failed");
  }
  return { number: data.number ?? null, url: data.originalDocAddress ?? null };
}
