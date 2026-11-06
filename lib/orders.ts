import type postgres from "postgres";
import { productFromRow, type Product } from "./catalog";
import { n, sql } from "./db";
import type { Locale } from "./i18n/config";
import { localized } from "./i18n/format";
import { quote, type CouponRule, type Quote, type Settings } from "./pricing";

import { ORDER_STATUSES, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "./order-status";

export { ACTIVE_STATUSES, ORDER_STATUSES, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "./order-status";

type Tx = postgres.TransactionSql | postgres.Sql;
type Row = Record<string, unknown>;

export class CheckoutError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/* ───────────── Settings, balances ───────────── */

export async function getSettings(db: Tx = sql()): Promise<Settings & { instagram: string | null }> {
  const [s] = await db`select * from settings where id = 1`;
  return {
    shippingFee: n(s?.shipping_fee ?? 30),
    freeShippingThreshold: s?.free_shipping_threshold === null || s?.free_shipping_threshold === undefined ? null : n(s.free_shipping_threshold),
    firstOrderDiscountPct: n(s?.first_order_discount_pct ?? 0),
    pointsEarnPct: n(s?.points_earn_pct ?? 5),
    pointValue: n(s?.point_value ?? 1) || 1,
    instagram: (s?.instagram as string | null) ?? null,
  };
}

export async function pointsBalance(userId: string, db: Tx = sql()): Promise<number> {
  const [r] = await db`select coalesce(sum(delta), 0)::int as balance from points_ledger where user_id = ${userId}`;
  return Number(r?.balance ?? 0);
}

export async function isFirstOrder(userId: string, db: Tx = sql()): Promise<boolean> {
  const [r] = await db`select count(*)::int as c from orders where user_id = ${userId} and status <> 'cancelled'`;
  return Number(r?.c ?? 0) === 0;
}

/* ───────────── Coupons ───────────── */

export async function validateCoupon(code: string, userId: string, subtotal: number, db: Tx = sql(), lock = false): Promise<{ id: string; rule: CouponRule }> {
  const clean = code.trim().toUpperCase();
  if (!clean) throw new CheckoutError("coupon_not_found");
  const rows = lock ? await db`select * from coupons where code = ${clean} for update` : await db`select * from coupons where code = ${clean}`;
  const c = rows[0];
  if (!c || !c.active) throw new CheckoutError("coupon_not_found");
  const now = Date.now();
  if (c.starts_at && new Date(String(c.starts_at)).getTime() > now) throw new CheckoutError("coupon_not_started");
  if (c.ends_at && new Date(String(c.ends_at)).getTime() < now) throw new CheckoutError("coupon_expired");
  if (c.max_uses !== null && Number(c.used_count) >= Number(c.max_uses)) throw new CheckoutError("coupon_used_up");
  if (subtotal < n(c.min_subtotal)) throw new CheckoutError("coupon_min_subtotal");
  if (c.once_per_customer) {
    const [used] = await db`
      select 1 from coupon_redemptions r join orders o on o.id = r.order_id
      where r.coupon_id = ${c.id as string} and r.user_id = ${userId} and o.status <> 'cancelled' limit 1`;
    if (used) throw new CheckoutError("coupon_already_used");
  }
  return { id: String(c.id), rule: { code: clean, kind: c.kind as CouponRule["kind"], value: n(c.value), minSubtotal: n(c.min_subtotal) } };
}

/* ───────────── Quote & checkout ───────────── */

export type CartLine = { id: string; qty: number };

async function loadLines(cart: CartLine[], db: Tx): Promise<{ product: Product; qty: number }[]> {
  const merged = new Map<string, number>();
  for (const l of cart) {
    const qty = Math.floor(Number(l.qty));
    if (typeof l.id !== "string" || !Number.isFinite(qty) || qty < 1 || qty > 50) throw new CheckoutError("invalid_cart");
    merged.set(l.id, Math.min(50, (merged.get(l.id) ?? 0) + qty));
  }
  if (merged.size === 0 || merged.size > 100) throw new CheckoutError("invalid_cart");
  const ids = [...merged.keys()];
  const rows = await db`select * from products where active and id::text in ${db(ids)}`;
  const products = rows.map(productFromRow);
  if (products.length !== ids.length) throw new CheckoutError("product_unavailable");
  return products.map((product) => ({ product, qty: merged.get(product.id)! }));
}

export type QuoteRequest = { cart: CartLine[]; couponCode?: string; usePoints?: boolean };
export type QuoteResult = Quote & { couponError: string | null };

/** Live price breakdown for the checkout page (no writes). */
export async function quoteFor(userId: string, req: QuoteRequest): Promise<QuoteResult> {
  const db = sql();
  const [lines, settings, balance, first] = await Promise.all([loadLines(req.cart, db), getSettings(db), pointsBalance(userId, db), isFirstOrder(userId, db)]);
  const priced = lines.map((l) => ({ price: l.product.price, qty: l.qty }));
  const subtotal = priced.reduce((s, l) => s + l.price * l.qty, 0);
  let coupon: CouponRule | null = null;
  let couponError: string | null = null;
  if (req.couponCode?.trim()) {
    try {
      coupon = (await validateCoupon(req.couponCode, userId, subtotal, db)).rule;
    } catch (e) {
      couponError = e instanceof CheckoutError ? e.code : "coupon_not_found";
    }
  }
  return { ...quote({ lines: priced, settings, coupon, firstOrder: first, pointsBalance: balance, usePoints: Boolean(req.usePoints) }), couponError };
}

export type Shipping = { name: string; phone: string; city: string; street: string; notes?: string };

export type PlaceOrderInput = QuoteRequest & {
  userId: string;
  method: PaymentMethod;
  shipping: Shipping;
  lang: Locale;
  saveAddress?: boolean;
};

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Creates the order atomically. Card / Bit / Apple Pay wait for payment; cash is received immediately. */
export async function placeOrder(input: PlaceOrderInput): Promise<{ id: string; number: number; total: number; quote: Quote }> {
  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) throw new CheckoutError("invalid_method");
  const ship = {
    name: clean(input.shipping?.name, 80),
    phone: clean(input.shipping?.phone, 30),
    city: clean(input.shipping?.city, 80),
    street: clean(input.shipping?.street, 160),
    notes: clean(input.shipping?.notes, 300) || null,
  };
  if (ship.name.length < 2 || ship.phone.replace(/\D/g, "").length < 7 || ship.city.length < 2 || ship.street.length < 2) throw new CheckoutError("invalid_shipping");

  return sql().begin(async (tx) => {
    // Serialize this customer's checkouts so points can't be spent twice.
    await tx`select id from profiles where id = ${input.userId} for update`;

    const lines = await loadLines(input.cart, tx);
    const settings = await getSettings(tx);
    const balance = await pointsBalance(input.userId, tx);
    const first = await isFirstOrder(input.userId, tx);
    const priced = lines.map((l) => ({ price: l.product.price, qty: l.qty }));
    const subtotal = priced.reduce((s, l) => s + l.price * l.qty, 0);

    let coupon: { id: string; rule: CouponRule } | null = null;
    if (input.couponCode?.trim()) coupon = await validateCoupon(input.couponCode, input.userId, subtotal, tx, true);

    const q = quote({ lines: priced, settings, coupon: coupon?.rule ?? null, firstOrder: first, pointsBalance: balance, usePoints: Boolean(input.usePoints) });
    const status: OrderStatus = input.method === "cash" ? "received" : "awaiting_payment";

    const [order] = await tx`
      insert into orders (user_id, status, payment_method, subtotal, discount_kind, discount_code, discount_amount,
        points_used, points_value, shipping_fee, total, points_earned, ship_name, ship_phone, ship_city, ship_street, ship_notes, lang)
      values (${input.userId}, ${status}, ${input.method}, ${q.subtotal}, ${q.discountKind}, ${q.discountCode}, ${q.discountAmount},
        ${q.pointsUsed}, ${q.pointsValue}, ${q.shippingFee}, ${q.total}, ${q.pointsEarned}, ${ship.name}, ${ship.phone}, ${ship.city}, ${ship.street}, ${ship.notes}, ${input.lang})
      returning id, number`;
    const orderId = String(order.id);

    for (const l of lines) {
      await tx`
        insert into order_items (order_id, product_id, name, unit_price, quantity, line_total)
        values (${orderId}, ${l.product.id}, ${localized(l.product.name, input.lang)}, ${l.product.price}, ${l.qty}, ${l.product.price * l.qty})`;
    }
    await tx`insert into order_events (order_id, status) values (${orderId}, ${status})`;

    if (q.pointsUsed > 0) {
      await tx`insert into points_ledger (user_id, order_id, delta, reason) values (${input.userId}, ${orderId}, ${-q.pointsUsed}, 'redeemed')`;
    }
    if (coupon && q.discountKind === "coupon") {
      await tx`insert into coupon_redemptions (coupon_id, user_id, order_id) values (${coupon.id}, ${input.userId}, ${orderId})`;
      await tx`update coupons set used_count = used_count + 1 where id = ${coupon.id}`;
    }

    // Keep the profile and (optionally) the address book up to date.
    await tx`update profiles set full_name = coalesce(full_name, ${ship.name}), phone = coalesce(phone, ${ship.phone}) where id = ${input.userId}`;
    if (input.saveAddress) {
      const [exists] = await tx`
        select 1 from addresses where user_id = ${input.userId} and city = ${ship.city} and street = ${ship.street} limit 1`;
      if (!exists) {
        const [count] = await tx`select count(*)::int as c from addresses where user_id = ${input.userId}`;
        await tx`
          insert into addresses (user_id, recipient, phone, city, street, notes, is_default)
          values (${input.userId}, ${ship.name}, ${ship.phone}, ${ship.city}, ${ship.street}, ${ship.notes}, ${Number(count.c) === 0})`;
      }
    }

    return { id: orderId, number: Number(order.number), total: q.total, quote: q };
  });
}

/* ───────────── Status changes (admin / payment) ───────────── */

/** Moves an order to a new status, awarding or refunding points as needed. */
export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<void> {
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) throw new CheckoutError("invalid_status");
  await sql().begin(async (tx) => {
    const [o] = await tx`select * from orders where id = ${orderId} for update`;
    if (!o) throw new CheckoutError("order_not_found");
    if (o.status === status) return;
    if (o.status === "cancelled") throw new CheckoutError("order_cancelled");
    const userId = String(o.user_id);

    if (status === "delivered" && !o.points_awarded && Number(o.points_earned) > 0) {
      await tx`insert into points_ledger (user_id, order_id, delta, reason) values (${userId}, ${orderId}, ${Number(o.points_earned)}, 'earned')`;
      await tx`update orders set points_awarded = true where id = ${orderId}`;
    }

    if (status === "cancelled") {
      if (Number(o.points_used) > 0) {
        await tx`insert into points_ledger (user_id, order_id, delta, reason) values (${userId}, ${orderId}, ${Number(o.points_used)}, 'refund')`;
      }
      if (o.points_awarded && Number(o.points_earned) > 0) {
        await tx`insert into points_ledger (user_id, order_id, delta, reason) values (${userId}, ${orderId}, ${-Number(o.points_earned)}, 'adjust')`;
        await tx`update orders set points_awarded = false where id = ${orderId}`;
      }
      const redeemed = await tx`delete from coupon_redemptions where order_id = ${orderId} returning coupon_id`;
      for (const r of redeemed) await tx`update coupons set used_count = greatest(used_count - 1, 0) where id = ${r.coupon_id as string}`;
    }

    // Cash is collected on delivery.
    if (status === "delivered" && o.payment_method === "cash" && o.payment_status === "pending") {
      await tx`update orders set payment_status = 'paid' where id = ${orderId}`;
    }

    await tx`update orders set status = ${status}, updated_at = now() where id = ${orderId}`;
    await tx`insert into order_events (order_id, status, note) values (${orderId}, ${status}, ${note ?? null})`;
  });
}

/** Records a successful payment (PayPlus callback or the owner marking it paid). */
export async function markPaid(orderId: string, transactionUid?: string | null): Promise<void> {
  await sql().begin(async (tx) => {
    const [o] = await tx`select status, payment_status from orders where id = ${orderId} for update`;
    if (!o || o.payment_status === "paid") return;
    await tx`
      update orders set payment_status = 'paid', payplus_transaction_uid = coalesce(${transactionUid ?? null}, payplus_transaction_uid),
        status = case when status = 'awaiting_payment' then 'received' else status end, updated_at = now()
      where id = ${orderId}`;
    if (o.status === "awaiting_payment") await tx`insert into order_events (order_id, status, note) values (${orderId}, 'received', 'paid')`;
  });
}

/* ───────────── Reading orders ───────────── */

export type OrderSummary = {
  id: string;
  number: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  total: number;
  createdAt: string;
  itemCount: number;
};

export type OrderDetail = OrderSummary & {
  subtotal: number;
  discountKind: string | null;
  discountCode: string | null;
  discountAmount: number;
  pointsUsed: number;
  pointsValue: number;
  shippingFee: number;
  pointsEarned: number;
  pointsAwarded: boolean;
  ship: { name: string; phone: string; city: string; street: string; notes: string | null };
  items: { name: string; unitPrice: number; quantity: number; lineTotal: number }[];
  events: { status: string; note: string | null; createdAt: string }[];
  lang: Locale;
  userEmail?: string;
  userId: string;
};

const iso = (v: unknown) => new Date(String(v)).toISOString();

function summary(o: Row): OrderSummary {
  return {
    id: String(o.id),
    number: Number(o.number),
    status: o.status as OrderStatus,
    paymentMethod: o.payment_method as PaymentMethod,
    paymentStatus: String(o.payment_status),
    total: n(o.total),
    createdAt: iso(o.created_at),
    itemCount: Number(o.item_count ?? 0),
  };
}

export async function listOrders(userId: string): Promise<OrderSummary[]> {
  const rows = await sql()`
    select o.*, (select coalesce(sum(quantity), 0) from order_items i where i.order_id = o.id)::int as item_count
    from orders o where o.user_id = ${userId} order by o.created_at desc`;
  return rows.map(summary);
}

async function detail(o: Row | undefined): Promise<OrderDetail | null> {
  if (!o) return null;
  const db = sql();
  const [items, events] = await Promise.all([
    db`select * from order_items where order_id = ${o.id as string} order by name`,
    db`select * from order_events where order_id = ${o.id as string} order by created_at, id`,
  ]);
  return {
    ...summary({ ...o, item_count: items.reduce((s, i) => s + Number(i.quantity), 0) }),
    subtotal: n(o.subtotal),
    discountKind: (o.discount_kind as string | null) ?? null,
    discountCode: (o.discount_code as string | null) ?? null,
    discountAmount: n(o.discount_amount),
    pointsUsed: Number(o.points_used),
    pointsValue: n(o.points_value),
    shippingFee: n(o.shipping_fee),
    pointsEarned: Number(o.points_earned),
    pointsAwarded: Boolean(o.points_awarded),
    ship: { name: String(o.ship_name), phone: String(o.ship_phone), city: String(o.ship_city), street: String(o.ship_street), notes: (o.ship_notes as string | null) ?? null },
    items: items.map((i) => ({ name: String(i.name), unitPrice: n(i.unit_price), quantity: Number(i.quantity), lineTotal: n(i.line_total) })),
    events: events.map((e) => ({ status: String(e.status), note: (e.note as string | null) ?? null, createdAt: iso(e.created_at) })),
    lang: o.lang as Locale,
    userEmail: (o.email as string | undefined) ?? undefined,
    userId: String(o.user_id),
  };
}

/** A customer's own order by its number (never another customer's). */
export async function getOrderForUser(userId: string, number: number): Promise<OrderDetail | null> {
  const [o] = await sql()`select * from orders where user_id = ${userId} and number = ${number}`;
  return detail(o);
}

export async function getOrderByNumber(number: number): Promise<OrderDetail | null> {
  const [o] = await sql()`select o.*, p.email from orders o join profiles p on p.id = o.user_id where o.number = ${number}`;
  return detail(o);
}

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  const [o] = await sql()`select o.*, p.email from orders o join profiles p on p.id = o.user_id where o.id = ${id}`;
  return detail(o);
}

export async function savePaymentRequest(orderId: string, pageRequestUid: string | null): Promise<void> {
  await sql()`update orders set payplus_page_request_uid = ${pageRequestUid} where id = ${orderId}`;
}
