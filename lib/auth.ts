import { cache } from "react";
import { sql } from "./db";
import { accountsEnabled } from "./supabase/config";
import { supabaseServer } from "./supabase/server";

export type SessionUser = { id: string; email: string };

/** The signed-in customer (verified with Supabase Auth), or null. Memoized per request. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  if (!accountsEnabled()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
});

/** Creates the profile row the first time a customer signs in. */
export async function ensureProfile(user: SessionUser, lang: string): Promise<void> {
  await sql()`
    insert into profiles (id, email, preferred_lang)
    values (${user.id}, ${user.email}, ${lang})
    on conflict (id) do update set email = excluded.email`;
}

/** Owner accounts: comma-separated list in ADMIN_EMAILS. */
export function isAdmin(user: SessionUser | null): boolean {
  if (!user) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(user.email);
}

/** The signed-in owner, or null (also null when accounts are not configured). */
export async function adminUser(): Promise<SessionUser | null> {
  const user = await currentUser();
  return isAdmin(user) ? user : null;
}

/** Guard for owner-only server actions. */
export async function assertAdmin(): Promise<SessionUser> {
  const user = await adminUser();
  if (!user) throw new Error("forbidden");
  return user;
}
