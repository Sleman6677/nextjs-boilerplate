"use server";

import { redirect } from "next/navigation";
import { ensureCustomer } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/config";
import { isMobile, normalizePhone } from "@/lib/phone";
import { accountsEnabled } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginTarget = { phone?: string; email?: string };
type Result = { ok: boolean; error?: "phone" | "email" | "send" | "code" | "unavailable" | "wait" };

function target(t: LoginTarget): { phone: string } | { email: string } | null {
  if (t.phone !== undefined) {
    const p = normalizePhone(t.phone);
    return isMobile(p) ? { phone: p } : null;
  }
  const e = String(t.email ?? "").trim().toLowerCase();
  return EMAIL.test(e) && e.length <= 200 ? { email: e } : null;
}

/** Sends a one-time code by SMS (customers) or email (staff fallback). */
export async function sendCode(t: LoginTarget): Promise<Result> {
  if (!accountsEnabled()) return { ok: false, error: "unavailable" };
  const to = target(t);
  if (!to) return { ok: false, error: t.phone !== undefined ? "phone" : "email" };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ ...to, options: { shouldCreateUser: true } });
  if (error) {
    console.error("signInWithOtp failed", error.status, error.message);
    return { ok: false, error: error.status === 429 ? "wait" : "send" };
  }
  return { ok: true };
}

export async function verifyCode(t: LoginTarget, code: string, lang: string): Promise<Result> {
  if (!accountsEnabled()) return { ok: false, error: "unavailable" };
  const to = target(t);
  const token = String(code ?? "").replace(/\D/g, "");
  if (!to || token.length < 6) return { ok: false, error: "code" };
  const supabase = await supabaseServer();
  const { data, error } = "phone" in to ? await supabase.auth.verifyOtp({ phone: to.phone, token, type: "sms" }) : await supabase.auth.verifyOtp({ email: to.email, token, type: "email" });
  if (error || !data.user) return { ok: false, error: "code" };
  // Phone-only logins come back with email "" — store that as no email.
  await ensureCustomer(data.user.id, data.user.email ? data.user.email.toLowerCase() : null, normalizePhone(data.user.phone), isLocale(lang) ? lang : "ar");
  return { ok: true };
}

export async function signOut(lang: string): Promise<void> {
  if (accountsEnabled()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect(`/${isLocale(lang) ? lang : "ar"}`);
}
