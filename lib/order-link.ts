import { createHmac, timingSafeEqual } from "node:crypto";
import type { Locale } from "./i18n/config";
import { siteUrl } from "./site-url";

function secret(): string {
  return process.env.ORDER_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.POSTGRES_URL || "dev-only-secret";
}

/** Unguessable token that lets the buyer open one order without signing in (link sent by SMS). */
export function orderToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`order:${orderId}`).digest("base64url").slice(0, 24);
}

export function checkOrderToken(orderId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const a = Buffer.from(orderToken(orderId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function orderPath(lang: Locale, number: number, orderId: string): string {
  return `/${lang}/order/${number}?t=${orderToken(orderId)}`;
}

export function orderLink(lang: Locale, number: number, orderId: string): string {
  return `${siteUrl()}${orderPath(lang, number, orderId)}`;
}
