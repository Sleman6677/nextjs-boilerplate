import { cache } from "react";
import { sql } from "./db";
import { isLocale, type Locale } from "./i18n/config";
import { normalizePhone } from "./phone";
import { accountsEnabled } from "./supabase/config";
import { supabaseServer } from "./supabase/server";

/** The signed-in customer. `id` is the customer (profile) id used by orders, points and favorites. */
export type SessionUser = { id: string; authId: string; email: string | null; phone: string | null };

/**
 * Links a Supabase login to its customer row: by login id, else by phone (customers created
 * at guest checkout), else by email; creates the row on first sign-in.
 */
async function linkCustomer(authId: string, rawEmail: string | null, phone: string | null, lang: Locale = "ar"): Promise<string> {
  const email = rawEmail?.trim() ? rawEmail.trim().toLowerCase() : null;
  const db = sql();
  const [linked] = await db`select id from profiles where auth_user_id = ${authId}`;
  if (linked) return String(linked.id);
  return db.begin(async (tx) => {
    const [byPhone] = phone ? await tx`select id from profiles where phone_norm = ${phone} and auth_user_id is null for update` : [];
    const [byEmail] = !byPhone && email ? await tx`select id from profiles where lower(email) = ${email} and auth_user_id is null for update` : [];
    const existing = byPhone ?? byEmail;
    if (existing) {
      await tx`update profiles set auth_user_id = ${authId}, phone_norm = coalesce(phone_norm, ${phone}), email = coalesce(email, ${email}) where id = ${existing.id as string}`;
      return String(existing.id);
    }
    const [row] = await tx`
      insert into profiles (auth_user_id, email, phone_norm, phone, preferred_lang)
      values (${authId}, ${email}, ${phone}, ${phone ? `0${phone.slice(4)}` : null}, ${lang})
      returning id`;
    return String(row.id);
  });
}

/** The signed-in customer (verified with Supabase Auth), or null. Memoized per request. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  if (!accountsEnabled()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return null;
  const email = u.email ? u.email.toLowerCase() : null;
  const phone = u.phone ? normalizePhone(u.phone) : null;
  if (!email && !phone) return null;
  const id = await linkCustomer(u.id, email, phone);
  return { id, authId: u.id, email, phone };
});

/** Called right after a successful sign-in to create/link the customer row in the visitor's language. */
export async function ensureCustomer(authId: string, email: string | null, phone: string | null, lang: string): Promise<string> {
  return linkCustomer(authId, email, phone, isLocale(lang) ? lang : "ar");
}

/* ───────────── Staff ───────────── */

export const PERMISSIONS = ["orders", "products", "customers", "marketing", "reports", "settings", "staff"] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type StaffUser = SessionUser & { name: string; owner: boolean; permissions: Permission[] };

const envList = (key: string) =>
  (process.env[key] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/** Owners come from ADMIN_EMAILS / ADMIN_PHONES (all permissions); other staff from the staff table. */
export const staffUser = cache(async (): Promise<StaffUser | null> => {
  const user = await currentUser();
  if (!user) return null;
  const ownerPhones = envList("ADMIN_PHONES").map(normalizePhone).filter(Boolean);
  if ((user.email && envList("ADMIN_EMAILS").includes(user.email)) || (user.phone && ownerPhones.includes(user.phone))) {
    return { ...user, name: user.email ?? user.phone ?? "owner", owner: true, permissions: [...PERMISSIONS] };
  }
  const [s] = await sql()`
    select * from staff where active and ((email is not null and lower(email) = ${user.email ?? ""}) or (phone_norm is not null and phone_norm = ${user.phone ?? ""}))`;
  if (!s) return null;
  const permissions = (s.permissions as string[]).filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p));
  return { ...user, name: String(s.name), owner: false, permissions };
});

/** Kept for older call sites: any staff member. */
export async function adminUser(): Promise<StaffUser | null> {
  return staffUser();
}

/** Guard for staff-only server actions; optionally requires one permission. */
export async function assertStaff(permission?: Permission): Promise<StaffUser> {
  const s = await staffUser();
  if (!s || (permission && !s.permissions.includes(permission))) throw new Error("forbidden");
  return s;
}

export const assertAdmin = assertStaff;

/** Writes who changed what (shown in the panel). */
export async function audit(actor: StaffUser | string, action: string, entity: string, entityId: string | null, details?: Record<string, unknown>): Promise<void> {
  const name = typeof actor === "string" ? actor : actor.name;
  await sql()`insert into audit_log (actor, action, entity, entity_id, details) values (${name}, ${action}, ${entity}, ${entityId}, ${details ? sql().json(details as never) : null})`;
}
