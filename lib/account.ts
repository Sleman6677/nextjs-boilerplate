import { sql } from "./db";
import { isLocale, type Locale } from "./i18n/config";

export type Profile = { id: string; email: string; fullName: string; phone: string; lang: Locale };
export type Address = { id: string; label: string; recipient: string; phone: string; city: string; street: string; notes: string; isDefault: boolean };
export type PointsEntry = { delta: number; reason: "earned" | "redeemed" | "refund" | "adjust"; orderNumber: number | null; createdAt: string };

export async function getProfile(userId: string): Promise<Profile | null> {
  const [p] = await sql()`select * from profiles where id = ${userId}`;
  if (!p) return null;
  const lang = String(p.preferred_lang);
  return { id: String(p.id), email: String(p.email), fullName: String(p.full_name ?? ""), phone: String(p.phone ?? ""), lang: isLocale(lang) ? lang : "ar" };
}

export async function listAddresses(userId: string): Promise<Address[]> {
  const rows = await sql()`select * from addresses where user_id = ${userId} order by is_default desc, created_at desc`;
  return rows.map((a) => ({
    id: String(a.id),
    label: String(a.label ?? ""),
    recipient: String(a.recipient),
    phone: String(a.phone),
    city: String(a.city),
    street: String(a.street),
    notes: String(a.notes ?? ""),
    isDefault: Boolean(a.is_default),
  }));
}

export async function getAddress(userId: string, id: string): Promise<Address | null> {
  return (await listAddresses(userId)).find((a) => a.id === id) ?? null;
}

export async function pointsHistory(userId: string): Promise<PointsEntry[]> {
  const rows = await sql()`
    select l.delta, l.reason, l.created_at, o.number
    from points_ledger l left join orders o on o.id = l.order_id
    where l.user_id = ${userId} order by l.created_at desc, l.id desc limit 200`;
  return rows.map((r) => ({
    delta: Number(r.delta),
    reason: r.reason as PointsEntry["reason"],
    orderNumber: r.number === null ? null : Number(r.number),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
}
