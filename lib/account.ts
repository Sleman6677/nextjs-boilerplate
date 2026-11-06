import { sql } from "./db";
import { isLocale, type Locale } from "./i18n/config";

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  phone: string; // +972…
  lang: Locale;
  birthday: string | null; // YYYY-MM-DD
  marketingConsent: boolean;
  createdAt: string;
};
export type Address = { id: string; label: string; recipient: string; phone: string; city: string; street: string; notes: string; isDefault: boolean };
export type PointsEntry = { delta: number; reason: "earned" | "redeemed" | "refund" | "adjust" | "expired"; orderNumber: number | null; createdAt: string; expiresAt: string | null; remaining: number | null };

const day = (v: unknown) => (v ? new Date(String(v)).toISOString().slice(0, 10) : null);

export async function getProfile(customerId: string): Promise<Profile | null> {
  const [p] = await sql()`select * from profiles where id = ${customerId}`;
  if (!p) return null;
  const lang = String(p.preferred_lang);
  return {
    id: String(p.id),
    email: String(p.email ?? ""),
    fullName: String(p.full_name ?? ""),
    phone: String(p.phone_norm ?? ""),
    lang: isLocale(lang) ? lang : "ar",
    birthday: p.birthday ? new Date(String(p.birthday)).toISOString().slice(0, 10) : null,
    marketingConsent: Boolean(p.marketing_consent),
    createdAt: new Date(String(p.created_at)).toISOString(),
  };
}

export async function listAddresses(customerId: string): Promise<Address[]> {
  const rows = await sql()`select * from addresses where user_id = ${customerId} order by is_default desc, created_at desc`;
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

export async function getAddress(customerId: string, id: string): Promise<Address | null> {
  return (await listAddresses(customerId)).find((a) => a.id === id) ?? null;
}

export async function pointsHistory(customerId: string): Promise<PointsEntry[]> {
  const rows = await sql()`
    select l.delta, l.reason, l.created_at, l.expires_at, l.remaining, o.number
    from points_ledger l left join orders o on o.id = l.order_id
    where l.user_id = ${customerId} order by l.created_at desc, l.id desc limit 200`;
  return rows.map((r) => ({
    delta: Number(r.delta),
    reason: r.reason as PointsEntry["reason"],
    orderNumber: r.number === null ? null : Number(r.number),
    createdAt: new Date(String(r.created_at)).toISOString(),
    expiresAt: r.expires_at ? new Date(String(r.expires_at)).toISOString() : null,
    remaining: r.remaining === null ? null : Number(r.remaining),
  }));
}

/** Points that expire soonest (for "N points expire on …"). */
export async function nextExpiry(customerId: string): Promise<{ points: number; date: string } | null> {
  const [r] = await sql()`
    select expires_at, sum(remaining)::int as pts from points_ledger
    where user_id = ${customerId} and delta > 0 and remaining > 0 and expires_at > now()
    group by expires_at order by expires_at limit 1`;
  return r ? { points: Number(r.pts), date: new Date(String(r.expires_at)).toISOString() } : null;
}

export async function favoriteIds(customerId: string): Promise<string[]> {
  const rows = await sql()`select product_id from favorites where customer_id = ${customerId} order by created_at desc`;
  return rows.map((r) => String(r.product_id));
}

/** Coupons this customer used, with the order they were used on. */
export async function couponsUsed(customerId: string): Promise<{ code: string; amount: number; orderNumber: number; date: string }[]> {
  const rows = await sql()`
    select c.code, r.discount_amount, o.number, r.created_at from coupon_redemptions r
    join coupons c on c.id = r.coupon_id join orders o on o.id = r.order_id
    where r.user_id = ${customerId} order by r.created_at desc`;
  return rows.map((r) => ({ code: String(r.code), amount: Number(r.discount_amount), orderNumber: Number(r.number), date: new Date(String(r.created_at)).toISOString() }));
}

/** Personal coupons waiting to be used (birthday, abandoned cart, staff-sent). */
export async function personalCoupons(customerId: string): Promise<{ code: string; kind: string; value: number; endsAt: string | null; purpose: string }[]> {
  const rows = await sql()`
    select c.* from coupons c
    where c.active and ${customerId} = any(c.customer_ids) and (c.ends_at is null or c.ends_at > now())
      and not exists (select 1 from coupon_redemptions r join orders o on o.id = r.order_id where r.coupon_id = c.id and r.user_id = ${customerId} and o.status <> 'cancelled')
    order by c.created_at desc`;
  return rows.map((c) => ({ code: String(c.code), kind: String(c.kind), value: Number(c.value), endsAt: c.ends_at ? new Date(String(c.ends_at)).toISOString() : null, purpose: String(c.purpose) }));
}

/** Gift cards bought by this customer. */
export async function giftCardsBought(customerId: string) {
  const rows = await sql()`select * from gift_cards where purchaser_id = ${customerId} order by created_at desc`;
  return rows.map((g) => ({ code: String(g.code), value: Number(g.initial_value), balance: Number(g.balance), expiresAt: g.expires_at ? new Date(String(g.expires_at)).toISOString() : null, disabled: Boolean(g.disabled) }));
}

/** Products from delivered orders that the customer has not reviewed yet. */
export async function reviewable(customerId: string): Promise<{ orderId: string; orderNumber: number; productId: string; name: string }[]> {
  const rows = await sql()`
    select distinct on (i.product_id) o.id as order_id, o.number, i.product_id, i.name from orders o
    join order_items i on i.order_id = o.id
    where o.user_id = ${customerId} and o.status = 'delivered' and i.product_id is not null and not i.is_gift_card
      and not exists (select 1 from reviews r where r.product_id = i.product_id and r.customer_id = ${customerId})
    order by i.product_id, o.created_at desc`;
  return rows.map((r) => ({ orderId: String(r.order_id), orderNumber: Number(r.number), productId: String(r.product_id), name: String(r.name) }));
}

export { day as isoDay };
