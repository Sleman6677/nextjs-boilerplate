import { l3, type L3 } from "./catalog";
import { n, sql } from "./db";

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : null);
// Sales = paid or cash orders that weren't cancelled; unpaid card/Bit orders don't count.

/* ───────────── Sales ───────────── */

export type Period = { label: string; sales: number; orders: number; avg: number; discounts: number };

export async function salesPeriods(): Promise<{ today: Period; week: Period; month: Period; all: Period; customers: number; newCustomersMonth: number }> {
  const db = sql();
  const [r] = await db`
    with b as (
      select (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem') as d,
             (date_trunc('week', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem') as w,
             (date_trunc('month', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem') as m
    )
    select
      coalesce(sum(o.total) filter (where o.created_at >= b.d), 0) as sd, count(*) filter (where o.created_at >= b.d)::int as od,
      coalesce(sum(o.total) filter (where o.created_at >= b.w), 0) as sw, count(*) filter (where o.created_at >= b.w)::int as ow,
      coalesce(sum(o.total) filter (where o.created_at >= b.m), 0) as sm, count(*) filter (where o.created_at >= b.m)::int as om,
      coalesce(sum(o.discount_amount + o.points_value) filter (where o.created_at >= b.m), 0) as dm,
      coalesce(sum(o.total), 0) as sa, count(*)::int as oa, coalesce(sum(o.discount_amount + o.points_value), 0) as da
    from orders o, b where o.status not in ('cancelled', 'awaiting_payment')`;
  const [c] = await db`
    select count(*)::int as c,
      count(*) filter (where created_at >= (date_trunc('month', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'))::int as m
    from profiles where exists (select 1 from orders o where o.user_id = profiles.id)`;
  const p = (label: string, s: unknown, o: unknown, disc: unknown = 0): Period => ({ label, sales: n(s), orders: Number(o), avg: Number(o) ? Math.round((n(s) / Number(o)) * 100) / 100 : 0, discounts: n(disc) });
  return { today: p("اليوم", r.sd, r.od), week: p("هذا الأسبوع", r.sw, r.ow), month: p("هذا الشهر", r.sm, r.om, r.dm), all: p("منذ البداية", r.sa, r.oa, r.da), customers: Number(c.c), newCustomersMonth: Number(c.m) };
}

/** Daily sales for the last N days (for the chart). */
export async function dailySales(days = 30): Promise<{ day: string; sales: number; orders: number }[]> {
  const rows = await sql()`
    with d as (select generate_series((now() at time zone 'Asia/Jerusalem')::date - ${days - 1}::int, (now() at time zone 'Asia/Jerusalem')::date, interval '1 day')::date as day)
    select d.day::text as day, coalesce(sum(o.total), 0) as sales, count(o.id)::int as orders
    from d left join orders o on (o.created_at at time zone 'Asia/Jerusalem')::date = d.day and o.status not in ('cancelled', 'awaiting_payment')
    group by d.day order by d.day`;
  return rows.map((r) => ({ day: String(r.day), sales: n(r.sales), orders: Number(r.orders) }));
}

export type ProductSales = { id: string; name: string; units: number; revenue: number; stock: number | null };

/** Products by units sold in the last N days (all active products included, so slow sellers show as 0). */
export async function productSales(days = 30): Promise<ProductSales[]> {
  const rows = await sql()`
    select p.id, p.name_ar,
      (select case when count(v.*) > 0 then sum(v.stock) end from product_variants v where v.product_id = p.id and v.active) as vstock, p.stock,
      coalesce(sum(i.quantity) filter (where o.id is not null), 0)::int as units, coalesce(sum(i.line_total) filter (where o.id is not null), 0) as revenue
    from products p
    left join order_items i on i.product_id = p.id
    left join orders o on o.id = i.order_id and o.status not in ('cancelled', 'awaiting_payment') and o.created_at > now() - make_interval(days => ${days})
    where p.active and p.kind = 'standard'
    group by p.id order by units desc, revenue desc`;
  return rows.map((r) => ({ id: String(r.id), name: String(r.name_ar), units: Number(r.units), revenue: n(r.revenue), stock: r.vstock !== null ? Number(r.vstock) : r.stock === null ? null : Number(r.stock) }));
}

export type StockAlert = { productId: string; name: string; variant: string | null; stock: number; threshold: number };

export async function stockAlerts(): Promise<{ low: StockAlert[]; out: StockAlert[] }> {
  const rows = await sql()`
    select p.id, p.name_ar, v.name_ar as variant, coalesce(v.stock, p.stock) as stock, p.low_stock_threshold
    from products p left join product_variants v on v.product_id = p.id and v.active
    where p.active and p.kind = 'standard' and coalesce(v.stock, p.stock) is not null
      and coalesce(v.stock, p.stock) <= p.low_stock_threshold
      and (v.id is not null or not exists (select 1 from product_variants x where x.product_id = p.id and x.active))
    order by coalesce(v.stock, p.stock), p.name_ar`;
  const all = rows.map((r) => ({ productId: String(r.id), name: String(r.name_ar), variant: (r.variant as string | null) ?? null, stock: Number(r.stock), threshold: Number(r.low_stock_threshold) }));
  return { out: all.filter((a) => a.stock <= 0), low: all.filter((a) => a.stock > 0) };
}

/* ───────────── Sources & coupons ───────────── */

export type SourceRow = { source: string; customers: number; orders: number; sales: number; discounts: number };

/** Where orders came from: coupon source, ?ref= influencer code, utm_source, or direct. */
export async function sources(days = 90): Promise<SourceRow[]> {
  const rows = await sql()`
    select coalesce(nullif(o.source, ''), 'direct') as source, count(distinct o.user_id)::int as customers, count(*)::int as orders,
      coalesce(sum(o.total), 0) as sales, coalesce(sum(o.discount_amount), 0) as discounts
    from orders o where o.status not in ('cancelled', 'awaiting_payment') and o.created_at > now() - make_interval(days => ${days})
    group by 1 order by sales desc`;
  return rows.map((r) => ({ source: String(r.source), customers: Number(r.customers), orders: Number(r.orders), sales: n(r.sales), discounts: n(r.discounts) }));
}

export type CouponStats = { users: number; uses: number; sales: number; discounts: number; redemptions: { name: string; phone: string; customerId: string; orderNumber: number; total: number; discount: number; at: string; status: string }[] };

export async function couponStats(couponId: string): Promise<CouponStats> {
  const rows = await sql()`
    select pr.id as customer_id, pr.full_name, pr.phone_norm, o.number, o.total, r.discount_amount, r.created_at, o.status
    from coupon_redemptions r join orders o on o.id = r.order_id join profiles pr on pr.id = r.user_id
    where r.coupon_id = ${couponId} order by r.created_at desc`;
  const live = rows.filter((r) => r.status !== "cancelled");
  return {
    users: new Set(live.map((r) => String(r.customer_id))).size,
    uses: live.length,
    sales: live.reduce((s, r) => s + n(r.total), 0),
    discounts: live.reduce((s, r) => s + n(r.discount_amount), 0),
    redemptions: rows.map((r) => ({ name: String(r.full_name ?? ""), phone: String(r.phone_norm ?? ""), customerId: String(r.customer_id), orderNumber: Number(r.number), total: n(r.total), discount: n(r.discount_amount), at: iso(r.created_at)!, status: String(r.status) })),
  };
}

/* ───────────── Offers ───────────── */

export type AdminOffer = { id: string; name: L3; kind: "percent" | "fixed"; value: number; scope: "all" | "products" | "categories"; productIds: string[]; categoryIds: string[]; minQty: number; startsAt: string | null; endsAt: string | null; active: boolean; running: boolean };

const offerOf = (o: Row): AdminOffer => ({
  id: String(o.id),
  name: l3(o, "name"),
  kind: o.kind as AdminOffer["kind"],
  value: n(o.value),
  scope: o.scope as AdminOffer["scope"],
  productIds: (o.product_ids as string[]).map(String),
  categoryIds: (o.category_ids as string[]).map(String),
  minQty: Number(o.min_qty),
  startsAt: iso(o.starts_at),
  endsAt: iso(o.ends_at),
  active: Boolean(o.active),
  running: Boolean(o.running),
});

export async function adminOffers(): Promise<AdminOffer[]> {
  return (await sql()`select *, active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()) as running from offers order by active desc, created_at desc`).map(offerOf);
}

export async function adminOffer(id: string): Promise<AdminOffer | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [o] = await sql()`select * from offers where id = ${id}`;
  return o ? offerOf(o) : null;
}

/* ───────────── Gift cards ───────────── */

export type AdminGiftCard = { id: string; code: string; paid: number; value: number; balance: number; status: "unused" | "partial" | "used" | "expired" | "disabled"; createdAt: string; expiresAt: string | null; buyer: string; buyerId: string | null; orderNumber: number | null; uses: { orderNumber: number | null; amount: number; at: string }[] };

export async function adminGiftCards(q = ""): Promise<AdminGiftCard[]> {
  const db = sql();
  const term = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const rows = await db`
    select g.*, p.full_name, p.phone_norm, o.number from gift_cards g
    left join profiles p on p.id = g.purchaser_id left join orders o on o.id = g.order_id
    where ${term ? db`g.code like ${`%${term}%`}` : db`true`}
    order by g.created_at desc limit 300`;
  const ids = rows.map((r) => String(r.id));
  const tx = ids.length ? await db`select t.*, o.number from gift_card_transactions t left join orders o on o.id = t.order_id where t.gift_card_id in ${db(ids)} order by t.created_at` : [];
  return rows.map((g) => {
    const value = n(g.initial_value);
    const balance = n(g.balance);
    const expired = g.expires_at && new Date(String(g.expires_at)).getTime() < Date.now();
    const status: AdminGiftCard["status"] = g.disabled ? "disabled" : balance <= 0 ? "used" : expired ? "expired" : balance < value ? "partial" : "unused";
    return {
      id: String(g.id),
      code: String(g.code).replace(/(.{4})(?=.)/g, "$1-"),
      paid: n(g.paid_amount),
      value,
      balance,
      status,
      createdAt: iso(g.created_at)!,
      expiresAt: iso(g.expires_at),
      buyer: g.full_name ? `${g.full_name} · ${g.phone_norm ?? ""}` : String(g.phone_norm ?? ""),
      buyerId: g.purchaser_id ? String(g.purchaser_id) : null,
      orderNumber: g.number === null || g.number === undefined ? null : Number(g.number),
      uses: tx.filter((t) => String(t.gift_card_id) === String(g.id)).map((t) => ({ orderNumber: t.number === null ? null : Number(t.number), amount: n(t.amount), at: iso(t.created_at)! })),
    };
  });
}

/* ───────────── Customers ───────────── */

export type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string | null;
  consent: boolean;
  joinedAt: string;
  orders: { number: number; total: number; status: string; createdAt: string }[];
  spent: number;
  points: number;
  products: { name: string; units: number }[];
  coupons: { code: string; discount: number; orderNumber: number; at: string }[];
  giftCards: { code: string; value: number; balance: number; role: "bought" | "used" }[];
  lastOrder: string | null;
};

export async function customerDetail(id: string): Promise<CustomerDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = sql();
  const [p] = await db`select * from profiles where id = ${id}`;
  if (!p) return null;
  const [orders, pts, products, coupons, bought, used] = await Promise.all([
    db`select number, total, status, created_at from orders where user_id = ${id} order by created_at desc`,
    db`select coalesce(sum(delta), 0)::int - coalesce(sum(remaining) filter (where delta > 0 and expires_at is not null and expires_at <= now()), 0)::int as b from points_ledger where user_id = ${id}`,
    db`select i.name, sum(i.quantity)::int as units from order_items i join orders o on o.id = i.order_id where o.user_id = ${id} and o.status <> 'cancelled' group by i.name order by units desc`,
    db`select c.code, r.discount_amount, o.number, r.created_at from coupon_redemptions r join coupons c on c.id = r.coupon_id join orders o on o.id = r.order_id where r.user_id = ${id} order by r.created_at desc`,
    db`select code, initial_value, balance from gift_cards where purchaser_id = ${id}`,
    db`select distinct g.code, g.initial_value, g.balance from gift_card_transactions t join gift_cards g on g.id = t.gift_card_id join orders o on o.id = t.order_id where o.user_id = ${id} and t.amount < 0`,
  ]);
  const live = orders.filter((o) => !["cancelled", "awaiting_payment"].includes(String(o.status)));
  return {
    id,
    name: String(p.full_name ?? ""),
    phone: String(p.phone_norm ?? ""),
    email: String(p.email ?? ""),
    birthday: p.birthday ? new Date(String(p.birthday)).toISOString().slice(0, 10) : null,
    consent: Boolean(p.marketing_consent),
    joinedAt: iso(p.created_at)!,
    orders: orders.map((o) => ({ number: Number(o.number), total: n(o.total), status: String(o.status), createdAt: iso(o.created_at)! })),
    spent: live.reduce((s, o) => s + n(o.total), 0),
    points: Number(pts[0]?.b ?? 0),
    products: products.map((r) => ({ name: String(r.name), units: Number(r.units) })),
    coupons: coupons.map((c) => ({ code: String(c.code), discount: n(c.discount_amount), orderNumber: Number(c.number), at: iso(c.created_at)! })),
    giftCards: [
      ...bought.map((g) => ({ code: String(g.code).replace(/(.{4})(?=.)/g, "$1-"), value: n(g.initial_value), balance: n(g.balance), role: "bought" as const })),
      ...used.map((g) => ({ code: String(g.code).replace(/(.{4})(?=.)/g, "$1-"), value: n(g.initial_value), balance: n(g.balance), role: "used" as const })),
    ],
    lastOrder: orders[0] ? iso(orders[0].created_at) : null,
  };
}

/* ───────────── Messages, carts, shipping, staff, audit ───────────── */

export async function messagesLog(status = "all") {
  const db = sql();
  const rows = await db`
    select m.*, p.full_name, o.number from messages m left join profiles p on p.id = m.customer_id left join orders o on o.id = m.order_id
    where ${status === "all" ? db`true` : db`m.status = ${status}`} order by m.created_at desc limit 200`;
  return rows.map((m) => ({ id: String(m.id), phone: String(m.phone_norm), name: String(m.full_name ?? ""), kind: String(m.kind), template: String(m.template ?? ""), body: String(m.body), status: String(m.status), error: (m.error as string | null) ?? null, orderNumber: m.number === null ? null : Number(m.number), createdAt: iso(m.created_at)! }));
}

export async function templates(): Promise<Record<string, { ar: string; he: string; en: string; enabled: boolean }>> {
  const rows = await sql()`select * from message_templates`;
  const out: Record<string, { ar: string; he: string; en: string; enabled: boolean }> = {};
  for (const r of rows) {
    const k = String(r.key);
    out[k] ??= { ar: "", he: "", en: "", enabled: true };
    out[k][r.lang as "ar" | "he" | "en"] = String(r.body);
    if (!r.enabled) out[k].enabled = false;
  }
  return out;
}

export async function abandonedCarts() {
  const rows = await sql()`
    select c.*, p.full_name, p.phone_norm, p.marketing_consent from carts c join profiles p on p.id = c.customer_id
    where jsonb_array_length(c.items) > 0 and c.recovered_order_id is null order by c.updated_at desc limit 200`;
  const productIds = [...new Set(rows.flatMap((r) => (r.items as { id: string }[]).map((i) => i.id)))];
  const products = productIds.length ? await sql()`select id, name_ar, price from products where id in ${sql()(productIds)}` : [];
  const byId = new Map(products.map((p) => [String(p.id), p]));
  return rows.map((c) => {
    const items = (c.items as { id: string; qty: number }[]).map((i) => ({ name: String(byId.get(i.id)?.name_ar ?? "—"), qty: i.qty, price: n(byId.get(i.id)?.price) }));
    return { id: String(c.id), customerId: String(c.customer_id), name: String(c.full_name ?? ""), phone: String(c.phone_norm ?? ""), consent: Boolean(c.marketing_consent), items, value: items.reduce((s, i) => s + i.qty * i.price, 0), updatedAt: iso(c.updated_at)!, remindedAt: iso(c.reminded_at), coupon: (c.coupon_code as string | null) ?? null };
  });
}

export async function zones() {
  const rows = await sql()`select * from shipping_zones order by sort, name_ar`;
  return rows.map((z) => ({ id: String(z.id), name: l3(z, "name"), price: n(z.price), freeThreshold: z.free_threshold === null ? null : n(z.free_threshold), isPickup: Boolean(z.is_pickup), active: Boolean(z.active), sort: Number(z.sort) }));
}

export async function carriers() {
  const rows = await sql()`select * from carriers order by name`;
  return rows.map((c) => ({ id: String(c.id), name: String(c.name), trackingUrl: String(c.tracking_url ?? ""), active: Boolean(c.active) }));
}

export async function staffList() {
  const rows = await sql()`select * from staff order by created_at`;
  return rows.map((s) => ({ id: String(s.id), name: String(s.name), email: String(s.email ?? ""), phone: String(s.phone_norm ?? ""), permissions: (s.permissions as string[]).map(String), active: Boolean(s.active) }));
}

export async function auditLog(limit = 200, entity?: string, entityId?: string) {
  const db = sql();
  const rows = await db`
    select * from audit_log where ${entity ? db`entity = ${entity}` : db`true`} and ${entityId ? db`entity_id = ${entityId}` : db`true`}
    order by created_at desc limit ${limit}`;
  return rows.map((a) => ({ id: Number(a.id), actor: String(a.actor), action: String(a.action), entity: String(a.entity), entityId: (a.entity_id as string | null) ?? null, details: (a.details as Record<string, unknown> | null) ?? null, at: iso(a.created_at)! }));
}
