"use server";

import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/config";
import { accountsEnabled } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendCode(email: string): Promise<{ ok: boolean; error?: "email" | "send" | "unavailable" }> {
  if (!accountsEnabled()) return { ok: false, error: "unavailable" };
  const clean = String(email ?? "").trim().toLowerCase();
  if (!EMAIL.test(clean) || clean.length > 200) return { ok: false, error: "email" };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
  if (error) {
    console.error("signInWithOtp failed", error.status, error.message);
    return { ok: false, error: "send" };
  }
  return { ok: true };
}

export async function verifyCode(email: string, code: string, lang: string): Promise<{ ok: boolean; error?: "code" | "unavailable" }> {
  if (!accountsEnabled()) return { ok: false, error: "unavailable" };
  const token = String(code ?? "").replace(/\D/g, "");
  if (token.length < 6) return { ok: false, error: "code" };
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ email: String(email).trim().toLowerCase(), token, type: "email" });
  if (error || !data.user?.email) return { ok: false, error: "code" };
  await ensureProfile({ id: data.user.id, email: data.user.email.toLowerCase() }, isLocale(lang) ? lang : "ar");
  return { ok: true };
}

export async function signOut(lang: string): Promise<void> {
  if (accountsEnabled()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect(`/${isLocale(lang) ? lang : "ar"}`);
}
