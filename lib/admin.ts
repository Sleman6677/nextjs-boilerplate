import { productFromRow, type L3, type Product } from "./catalog";
import { n, sql } from "./db";
import { ACTIVE_STATUSES, ORDER_STATUSES, type OrderStatus, type OrderSummary } from "./orders";

type Row = Record<string, unknown>;
const l3 = (row: Row, field: string): L3 => ({ ar: String(row[`${field}_ar`] ?? ""), he: String(row[`${field}_he`] ?? ""), en: String(row[`${field}_en`] ?? "") });
const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : null);

/* ───────────── Dashboard ───────────── */

export type Dashboard = {
  toPrepare: number;
  awaitingPayment: number;
  onTheWay: number;
  salesToday: number;
  salesMonth: number;
  ordersMonth: number;
  customers: number;
};

/** Sales exclude cancelled orders and card/Bit orders that were never paid. */
export async function getDashboard(): Promise<Dashboard> {
  const db = sql();
  const [[o], [c]] = await Promise.all([
    db`
      with b as (
        select (date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem') as day,
               (date_trunc('month', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem') as month
      )
      select
        count(*) filter (where status in ('received', 'preparing'))::int as to_prepare,
        count(*) filter (where status = 'awaiting_payment')::int as awaiting,
        count(*) filter (where status = 'shipped')::int as on_the_way,
        coalesce(sum(total) filter (where status not in ('cancelled', 'awaiting_payment') and created_at >= b.day), 0) as today,
        coalesce(sum(total) filter (where status not in ('cancelled', 'awaiting_payment') and created_at >= b.month), 0) as month,
        count(*) filter (where status not in ('cancelled', 'awaiting_payment') and created_at >= b.month)::int as month_orders
      from orders, b`,
    db`select count(*)::int as c from profiles`,
  ]);
  return {
    toPrepare: Number(o.to_prepare),
    awaitingPayment: Number(o.awaiting),
    onTheWay: Number(o.on_the_way),
    salesToday: n(o.today),
    salesMonth: n(o.month),
    ordersMonth: Number(o.month_orders),
    customers: Number(c.c),
  };
}

/* ───────────── Orders ───────────── */

export type AdminOrder = OrderSummary & { email: string; name: string; phone: string; city: string };
export type OrderFilter = "active" | "all" | OrderStatus;

export function parseOrderFilter(value: unknown): OrderFilter {
  if (value === "all" || value === "active") return value;
  return (ORDER_STATUSES as readonly unknown[]).includes(value) ? (value as OrderStatus) : "active";
}

export async function adminOrders({ filter = "active", q = "", limit = 200 }: { filter?: OrderFilter; q?: string; limit?: number }): Promise<AdminOrder[]> {
  const db = sql();
  const term = q.trim().slice(0, 80);
  const statusCond = filter === "all" ? db`` : filter === "active" ? db`and o.status in ${db(ACTIVE_STATUSES)}` : db`and o.status = ${filter}`;
  const digits = term.replace(/\D/g, "");
  const like = `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const searchCond = !term
    ? db``
    : /^#?\d+$/.test(term)
      ? db`and (o.number = ${Number(digits)} or regexp_replace(o.ship_phone, '\\D', '', 'g') like ${`%${digits}%`})`
      : db`and (p.email ilike ${like} or o.ship_name ilike ${like} or o.ship_city ilike ${like} or p.full_name ilike ${like})`;
  const rows = await db`
    select o.*, p.email, p.full_name,
      (select coalesce(sum(quantity), 0) from order_items i where i.order_id = o.id)::int as item_count
    from orders o join profiles p on p.id = o.user_id
    where true ${statusCond} ${searchCond}
    order by o.created_at desc
    limit ${limit}`;
  return rows.map((o) => ({
    id: String(o.id),
    number: Number(o.number),
    status: o.status as OrderStatus,
    paymentMethod: o.payment_method as OrderSummary["paymentMethod"],
    paymentStatus: String(o.payment_status),
    total: n(o.total),
    createdAt: new Date(String(o.created_at)).toISOString(),
    itemCount: Number(o.item_count),
    email: String(o.email),
    name: String(o.ship_name || o.full_name || ""),
    phone: String(o.ship_phone ?? ""),
    city: String(o.ship_city ?? ""),
  }));
}

export async function orderCounts(): Promise<Record<OrderStatus, number>> {
  const rows = await sql()`select status, count(*)::int as c from orders group by status`;
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const r of rows) counts[r.status as OrderStatus] = Number(r.c);
  return counts;
}

/* ───────────── Products & categories ───────────── */

export type AdminProduct = Product & { active: boolean; sort: number; sold: number };
export type AdminCategory = { id: string; slug: string; name: L3; description: L3; sort: number; active: boolean; productCount: number; imageUrl: string | null };

export async function adminProducts(): Promise<AdminProduct[]> {
  const rows = await sql()`
    select p.*,
      (select coalesce(sum(i.quantity), 0) from order_items i join orders o on o.id = i.order_id
        where i.product_id = p.id and o.status <> 'cancelled')::int as sold
    from products p order by p.sort, p.created_at`;
  return rows.map((r) => ({ ...productFromRow(r), active: Boolean(r.active), sort: Number(r.sort), sold: Number(r.sold) }));
}

export async function adminProduct(id: string): Promise<AdminProduct | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql()`select * from products where id = ${id}`;
  return r ? { ...productFromRow(r), active: Boolean(r.active), sort: Number(r.sort), sold: 0 } : null;
}

export async function adminCategories(): Promise<AdminCategory[]> {
  const rows = await sql()`
    select c.*, (select count(*) from products p where p.category_id = c.id)::int as product_count
    from categories c order by c.sort, c.name_en`;
  return rows.map((c) => ({
    id: String(c.id),
    slug: String(c.slug),
    name: l3(c, "name"),
    description: l3(c, "description"),
    sort: Number(c.sort),
    active: Boolean(c.active),
    productCount: Number(c.product_count),
    imageUrl: c.image_url ? String(c.image_url) : null,
  }));
}

/* ───────────── Coupons ───────────── */

export type AdminCoupon = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  startsAt: string | null;
  endsAt: string | null;
  maxUses: number | null;
  usedCount: number;
  oncePerCustomer: boolean;
  active: boolean;
  name: string;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  excludeSale: boolean;
  source: string;
  purpose: string;
  personal: boolean;
};

const coupon = (c: Row): AdminCoupon => ({
  id: String(c.id),
  code: String(c.code),
  kind: c.kind as AdminCoupon["kind"],
  value: n(c.value),
  minSubtotal: n(c.min_subtotal),
  startsAt: iso(c.starts_at),
  endsAt: iso(c.ends_at),
  maxUses: c.max_uses === null ? null : Number(c.max_uses),
  usedCount: Number(c.used_count),
  oncePerCustomer: Boolean(c.once_per_customer),
  active: Boolean(c.active),
  name: String(c.name ?? ""),
  scope: (c.scope as AdminCoupon["scope"]) ?? "all",
  productIds: ((c.product_ids as string[]) ?? []).map(String),
  categoryIds: ((c.category_ids as string[]) ?? []).map(String),
  excludeSale: Boolean(c.exclude_sale),
  source: String(c.source ?? ""),
  purpose: String(c.purpose ?? "general"),
  personal: ((c.customer_ids as string[]) ?? []).length > 0,
});

export async function adminCoupons(): Promise<AdminCoupon[]> {
  const rows = await sql()`select * from coupons where purpose = 'general' or cardinality(customer_ids) = 0 order by active desc, created_at desc`;
  return rows.map(coupon);
}

export async function adminCoupon(id: string): Promise<AdminCoupon | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql()`select * from coupons where id = ${id}`;
  return r ? coupon(r) : null;
}

/* ───────────── Customers ───────────── */

export type AdminCustomer = { id: string; email: string; name: string; phone: string; birthday: string | null; orders: number; spent: number; points: number; joinedAt: string; lastOrder: string | null };

export async function adminCustomers(q = ""): Promise<AdminCustomer[]> {
  const db = sql();
  const term = q.trim().slice(0, 80);
  const like = `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
  const digits = term.replace(/\D/g, "");
  const rows = await db`
    select p.*,
      (select count(*) from orders o where o.user_id = p.id and o.status <> 'cancelled')::int as orders,
      (select coalesce(sum(total), 0) from orders o where o.user_id = p.id and o.status not in ('cancelled', 'awaiting_payment')) as spent,
      (select max(created_at) from orders o where o.user_id = p.id) as last_order,
      (select coalesce(sum(delta), 0) - coalesce(sum(remaining) filter (where delta > 0 and expires_at is not null and expires_at <= now()), 0) from points_ledger l where l.user_id = p.id)::int as points
    from profiles p
    where true ${term ? db`and (p.email ilike ${like} or p.full_name ilike ${like} ${digits.length >= 3 ? db`or regexp_replace(coalesce(p.phone_norm, ''), '\\D', '', 'g') like ${`%${digits.replace(/^0/, "")}%`}` : db``})` : db``}
    order by coalesce((select max(created_at) from orders o where o.user_id = p.id), p.created_at) desc
    limit 300`;
  return rows.map((p) => ({
    id: String(p.id),
    email: String(p.email ?? ""),
    name: String(p.full_name ?? ""),
    phone: String(p.phone_norm ?? p.phone ?? ""),
    birthday: p.birthday ? new Date(String(p.birthday)).toISOString().slice(0, 10) : null,
    orders: Number(p.orders),
    spent: n(p.spent),
    points: Number(p.points),
    joinedAt: new Date(String(p.created_at)).toISOString(),
    lastOrder: p.last_order ? new Date(String(p.last_order)).toISOString() : null,
  }));
}
