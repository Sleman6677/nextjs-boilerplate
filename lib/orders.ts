import { randomInt } from "node:crypto";
import type postgres from "postgres";
import { activeOffers, l3, productFromRow, type L3, type Product, type Variant } from "./catalog";
import { n, sql } from "./db";
import type { Locale } from "./i18n/config";
import { localized } from "./i18n/format";
import { ORDER_STATUSES, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "./order-status";
import { normalizePhone } from "./phone";
import { quote, round2, type CouponRule, type PriceLine, type Quote, type Settings } from "./pricing";

export { ACTIVE_STATUSES, ORDER_STATUSES, PAYMENT_METHODS, type OrderStatus, type PaymentMethod } from "./order-status";

type Tx = postgres.TransactionSql | postgres.Sql;
type Row = Record<string, unknown>;

export class CheckoutError extends Error {
  constructor(
    public code: string,
    public detail?: string,
  ) {
    super(code);
  }
}

/* ───────────── Settings ───────────── */

export type StoreSettings = Settings & {
  instagram: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  pointsExpiryMonths: number | null;
  giftCardBonusPct: number;
  giftCardValidMonths: number | null;
  birthday: { enabled: boolean; kind: "percent" | "fixed"; value: number; validDays: number };
  abandonedCart: { enabled: boolean; hours: number };
  unpaidCancelHours: number;
  announcement: L3;
  ownerPhone: string | null;
  invoiceDocType: "inv_tax_receipt" | "inv_receipt";
};

export async function getSettings(db: Tx = sql()): Promise<StoreSettings> {
  const [s = {}] = await db`select * from settings where id = 1`;
  const r = s as Row;
  return {
    shippingFee: n(r.shipping_fee ?? 30),
    freeShippingThreshold: r.free_shipping_threshold === null || r.free_shipping_threshold === undefined ? null : n(r.free_shipping_threshold),
    firstOrderDiscountPct: n(r.first_order_discount_pct ?? 0),
    pointsEarnPct: n(r.points_earn_pct ?? 5),
    pointValue: n(r.point_value ?? 1) || 1,
    instagram: (r.instagram as string | null) ?? null,
    tiktok: (r.tiktok as string | null) ?? null,
    whatsapp: (r.whatsapp as string | null) ?? null,
    pointsExpiryMonths: r.points_expiry_months ? Number(r.points_expiry_months) : null,
    giftCardBonusPct: n(r.gift_card_bonus_pct ?? 10),
    giftCardValidMonths: r.gift_card_valid_months ? Number(r.gift_card_valid_months) : null,
    birthday: { enabled: r.birthday_enabled !== false, kind: r.birthday_kind === "fixed" ? "fixed" : "percent", value: n(r.birthday_value ?? 15), validDays: Number(r.birthday_valid_days ?? 14) },
    abandonedCart: { enabled: r.abandoned_cart_enabled !== false, hours: Number(r.abandoned_cart_hours ?? 3) },
    unpaidCancelHours: Number(r.unpaid_cancel_hours ?? 24),
    announcement: l3(r, "announcement"),
    ownerPhone: (r.owner_phone as string | null) ?? null,
    invoiceDocType: r.invoice_doc_type === "inv_receipt" ? "inv_receipt" : "inv_tax_receipt",
  };
}

/* ───────────── Points (batches expire oldest first) ───────────── */

export async function pointsBalance(customerId: string, db: Tx = sql()): Promise<number> {
  const [r] = await db`
    select coalesce(sum(delta), 0)::int
      - coalesce(sum(remaining) filter (where delta > 0 and expires_at is not null and expires_at <= now()), 0)::int as balance
    from points_ledger where user_id = ${customerId}`;
  return Number(r?.balance ?? 0);
}

async function addPoints(tx: Tx, customerId: string, amount: number, reason: "earned" | "refund" | "adjust", orderId: string | null, expiryMonths: number | null) {
  if (amount <= 0) return;
  await tx`
    insert into points_ledger (user_id, order_id, delta, reason, remaining, expires_at)
    values (${customerId}, ${orderId}, ${amount}, ${reason}, ${amount},
      ${expiryMonths ? tx`now() + make_interval(months => ${expiryMonths})` : null})`;
}

async function spendPoints(tx: Tx, customerId: string, amount: number, reason: "redeemed" | "adjust", orderId: string | null) {
  if (amount <= 0) return;
  await tx`insert into points_ledger (user_id, order_id, delta, reason) values (${customerId}, ${orderId}, ${-amount}, ${reason})`;
  let left = amount;
  const lots = await tx`
    select id, remaining from points_ledger
    where user_id = ${customerId} and delta > 0 and remaining > 0 and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at for update`;
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(left, Number(lot.remaining));
    await tx`update points_ledger set remaining = remaining - ${take} where id = ${lot.id as number}`;
    left -= take;
  }
}

/** Writes "expired" entries for batches past their date (the balance already ignores them). */
export async function expirePoints(): Promise<number> {
  return sql().begin(async (tx) => {
    const lots = await tx`
      select id, user_id, remaining from points_ledger
      where delta > 0 and remaining > 0 and expires_at is not null and expires_at <= now() for update`;
    for (const l of lots) {
      await tx`insert into points_ledger (user_id, delta, reason, remaining) values (${l.user_id as string}, ${-Number(l.remaining)}, 'expired', null)`;
      await tx`update points_ledger set remaining = 0 where id = ${l.id as number}`;
    }
    return lots.length;
  });
}

/* ───────────── Customers (membership by phone) ───────────── */

export async function isFirstOrder(customerId: string | null, db: Tx = sql()): Promise<boolean> {
  if (!customerId) return true;
  const [r] = await db`select count(*)::int as c from orders where user_id = ${customerId} and status <> 'cancelled'`;
  return Number(r?.c ?? 0) === 0;
}

export async function findCustomerByPhone(phoneNorm: string, db: Tx = sql()): Promise<string | null> {
  const [r] = await db`select id from profiles where phone_norm = ${phoneNorm}`;
  return r ? String(r.id) : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export type CustomerInput = { name: string; phone: string; email?: string | null; lang: Locale; birthday?: string | null; marketingConsent?: boolean; source?: string | null };

/** The customer for this phone, created on the first order. Returns the customer id. */
export async function upsertCustomer(tx: Tx, c: CustomerInput, signedInId: string | null): Promise<string> {
  const phoneNorm = normalizePhone(c.phone);
  if (!phoneNorm) throw new CheckoutError("invalid_phone");
  const email = c.email && EMAIL.test(c.email) ? c.email.trim().toLowerCase().slice(0, 200) : null;
  const birthday = c.birthday && /^\d{4}-\d{2}-\d{2}$/.test(c.birthday) ? c.birthday : null;
  const consent = Boolean(c.marketingConsent);
  let id = signedInId;
  if (!id) id = await findCustomerByPhone(phoneNorm, tx);
  if (!id) {
    const [taken] = email ? await tx`select 1 from profiles where lower(email) = ${email}` : [];
    const [row] = await tx`
      insert into profiles (phone_norm, phone, full_name, email, preferred_lang, birthday, marketing_consent, marketing_consent_at, source)
      values (${phoneNorm}, ${c.phone.trim()}, ${c.name}, ${taken ? null : email}, ${c.lang}, ${birthday}, ${consent}, ${consent ? new Date() : null}, ${c.source ?? null})
      on conflict (phone_norm) where phone_norm is not null do update set full_name = coalesce(profiles.full_name, excluded.full_name)
      returning id`;
    return String(row.id);
  }
  // Fill in what is missing; marketing consent is only ever granted here, never withdrawn silently.
  const [taken] = email ? await tx`select 1 from profiles where lower(email) = ${email} and id <> ${id}` : [];
  const [phoneOwner] = await tx`select id from profiles where phone_norm = ${phoneNorm} and id <> ${id}`;
  await tx`
    update profiles set
      full_name = coalesce(nullif(full_name, ''), ${c.name}),
      phone = coalesce(nullif(phone, ''), ${c.phone.trim()}),
      phone_norm = coalesce(phone_norm, ${phoneOwner ? null : phoneNorm}),
      email = coalesce(email, ${taken ? null : email}),
      birthday = coalesce(birthday, ${birthday}),
      marketing_consent = marketing_consent or ${consent},
      marketing_consent_at = case when ${consent} and not marketing_consent then now() else marketing_consent_at end
    where id = ${id}`;
  return id;
}

/* ───────────── Coupons & gift cards ───────────── */

export async function validateCoupon(code: string, customerId: string | null, db: Tx = sql(), lock = false): Promise<{ id: string; rule: CouponRule; source: string | null }> {
  const clean = code.trim().toUpperCase();
  if (!clean) throw new CheckoutError("coupon_not_found");
  const rows = lock ? await db`select * from coupons where code = ${clean} for update` : await db`select * from coupons where code = ${clean}`;
  const c = rows[0];
  if (!c || !c.active) throw new CheckoutError("coupon_not_found");
  const personal = (c.customer_ids as string[]).map(String);
  if (personal.length > 0 && (!customerId || !personal.includes(customerId))) throw new CheckoutError("coupon_not_found");
  const now = Date.now();
  if (c.starts_at && new Date(String(c.starts_at)).getTime() > now) throw new CheckoutError("coupon_not_started");
  if (c.ends_at && new Date(String(c.ends_at)).getTime() < now) throw new CheckoutError("coupon_expired");
  if (c.max_uses !== null && Number(c.used_count) >= Number(c.max_uses)) throw new CheckoutError("coupon_used_up");
  if (c.once_per_customer && customerId) {
    const [used] = await db`
      select 1 from coupon_redemptions r join orders o on o.id = r.order_id
      where r.coupon_id = ${c.id as string} and r.user_id = ${customerId} and o.status <> 'cancelled' limit 1`;
    if (used) throw new CheckoutError("coupon_already_used");
  }
  return {
    id: String(c.id),
    source: (c.source as string | null) ?? null,
    rule: {
      code: clean,
      kind: c.kind as CouponRule["kind"],
      value: n(c.value),
      minSubtotal: n(c.min_subtotal),
      scope: (c.scope as CouponRule["scope"]) ?? "all",
      productIds: (c.product_ids as string[]).map(String),
      categoryIds: (c.category_ids as string[]).map(String),
      excludeSale: Boolean(c.exclude_sale),
    },
  };
}

const GIFT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const normalizeGiftCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const formatGiftCode = (code: string) => code.replace(/(.{4})(?=.)/g, "$1-");

export async function findGiftCard(code: string, db: Tx = sql(), lock = false): Promise<{ id: string; balance: number; expiresAt: string | null }> {
  const clean = normalizeGiftCode(code);
  if (clean.length < 8) throw new CheckoutError("gift_not_found");
  const rows = lock ? await db`select * from gift_cards where code = ${clean} for update` : await db`select * from gift_cards where code = ${clean}`;
  const g = rows[0];
  if (!g || g.disabled) throw new CheckoutError("gift_not_found");
  if (g.expires_at && new Date(String(g.expires_at)).getTime() < Date.now()) throw new CheckoutError("gift_expired");
  if (n(g.balance) <= 0) throw new CheckoutError("gift_empty");
  return { id: String(g.id), balance: n(g.balance), expiresAt: g.expires_at ? new Date(String(g.expires_at)).toISOString() : null };
}

/* ───────────── Cart lines ───────────── */

export type CartLine = { id: string; variantId?: string | null; qty: number };
type Loaded = { product: Product; variant: Variant | null; qty: number; line: PriceLine };

async function loadLines(cart: CartLine[], db: Tx, lock = false): Promise<Loaded[]> {
  const merged = new Map<string, { id: string; variantId: string | null; qty: number }>();
  if (!Array.isArray(cart)) throw new CheckoutError("invalid_cart");
  for (const l of cart) {
    const qty = Math.floor(Number(l?.qty));
    const variantId = l?.variantId ? String(l.variantId) : null;
    if (typeof l?.id !== "string" || !Number.isFinite(qty) || qty < 1 || qty > 50) throw new CheckoutError("invalid_cart");
    const key = `${l.id}:${variantId ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { id: l.id, variantId, qty: Math.min(50, (prev?.qty ?? 0) + qty) });
  }
  if (merged.size === 0 || merged.size > 60) throw new CheckoutError("invalid_cart");
  const ids = [...new Set([...merged.values()].map((l) => l.id))];
  if (ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new CheckoutError("product_unavailable");

  const rows = lock ? await db`select * from products where active and id in ${db(ids)} for update` : await db`select * from products where active and id in ${db(ids)}`;
  const vrows = lock
    ? await db`select * from product_variants where product_id in ${db(ids)} for update`
    : await db`select * from product_variants where product_id in ${db(ids)}`;
  const addons = await db`select product_id, addon_id, special_price from product_addons where product_id in ${db(ids)} and addon_id in ${db(ids)}`;
  const products = new Map(rows.map((r) => [String(r.id), productFromRow(r)]));
  const variants = new Map<string, Variant & { productId: string }>(
    vrows.map((v) => [String(v.id), { id: String(v.id), productId: String(v.product_id), name: l3(v, "name"), price: v.price === null ? null : n(v.price), stock: v.stock === null ? null : Number(v.stock), active: Boolean(v.active) }]),
  );
  const qtyOf = (productId: string) => [...merged.values()].filter((l) => l.id === productId).reduce((s, l) => s + l.qty, 0);

  return [...merged.entries()].map(([key, l]) => {
    const product = products.get(l.id);
    if (!product) throw new CheckoutError("product_unavailable");
    const options = [...variants.values()].filter((v) => v.productId === l.id && v.active);
    let variant: Variant | null = null;
    if (options.length > 0) {
      variant = l.variantId ? (options.find((v) => v.id === l.variantId) ?? null) : null;
      if (!variant) throw new CheckoutError("option_required", product.name.ar);
    } else if (l.variantId) throw new CheckoutError("product_unavailable");
    const stock = variant ? variant.stock : product.stock;
    if (stock !== null && !product.sellWhenOut && l.qty > stock) throw new CheckoutError("out_of_stock", localized(product.name, "ar") + (variant ? ` (${variant.name.ar})` : ""));

    let addonPrice: number | null = null;
    let addonQty = 0;
    for (const a of addons) {
      if (String(a.addon_id) !== l.id) continue;
      const price = n(a.special_price);
      addonPrice = addonPrice === null ? price : Math.min(addonPrice, price);
      addonQty += qtyOf(String(a.product_id));
    }
    const giftCard = product.kind === "gift_card";
    return {
      product,
      variant,
      qty: l.qty,
      line: {
        key,
        productId: product.id,
        categoryId: product.categoryId,
        qty: l.qty,
        listPrice: variant?.price ?? product.price,
        salePrice: giftCard ? null : product.salePrice,
        giftCard,
        addonPrice: giftCard ? null : addonPrice,
        addonQty,
      },
    };
  });
}

/* ───────────── Shipping zones ───────────── */

export type Zone = { id: string; name: L3; price: number; freeThreshold: number | null; isPickup: boolean };

export async function listZones(db: Tx = sql()): Promise<Zone[]> {
  const rows = await db`select * from shipping_zones where active order by sort, name_ar`;
  return rows.map((z) => ({ id: String(z.id), name: l3(z, "name"), price: n(z.price), freeThreshold: z.free_threshold === null ? null : n(z.free_threshold), isPickup: Boolean(z.is_pickup) }));
}

/* ───────────── Quote ───────────── */

export type QuoteRequest = { cart: CartLine[]; couponCode?: string; usePoints?: boolean; giftCardCode?: string; zoneId?: string | null; phone?: string };

export type QuoteItem = { key: string; productId: string; variantId: string | null; slug: string; name: L3; variantName: L3 | null; imageUrl: string | null; art: Product["art"]; kind: Product["kind"] };

export type QuoteResult = Quote & {
  items: QuoteItem[];
  couponError: string | null;
  giftCardError: string | null;
  giftCardBalance: number;
  zone: Zone | null;
  pointsBalance: number;
  pointValue: number;
  firstOrder: boolean;
};

function couponIssueCode(issue: Quote["couponIssue"]): string | null {
  return issue === "min_subtotal" ? "coupon_min_subtotal" : issue === "not_applicable" ? "coupon_not_applicable" : null;
}

/** Live price breakdown for the cart and checkout (no writes). Points need a signed-in customer. */
export async function quoteFor(signedInId: string | null, req: QuoteRequest): Promise<QuoteResult> {
  const db = sql();
  const phoneNorm = req.phone ? normalizePhone(req.phone) : null;
  const customerId = signedInId ?? (phoneNorm ? await findCustomerByPhone(phoneNorm, db) : null);
  const [lines, settings, offers, zones, balance, first] = await Promise.all([
    loadLines(req.cart, db),
    getSettings(db),
    activeOffers(db),
    listZones(db),
    signedInId ? pointsBalance(signedInId, db) : Promise.resolve(0),
    isFirstOrder(customerId, db),
  ]);
  const zone = zones.find((z) => z.id === req.zoneId) ?? null;

  let coupon: CouponRule | null = null;
  let couponError: string | null = null;
  if (req.couponCode?.trim()) {
    try {
      coupon = (await validateCoupon(req.couponCode, customerId, db)).rule;
    } catch (e) {
      couponError = e instanceof CheckoutError ? e.code : "coupon_not_found";
    }
  }
  let giftCardBalance = 0;
  let giftCardError: string | null = null;
  if (req.giftCardCode?.trim()) {
    try {
      giftCardBalance = (await findGiftCard(req.giftCardCode, db)).balance;
    } catch (e) {
      giftCardError = e instanceof CheckoutError ? e.code : "gift_not_found";
    }
  }

  const q = quote({
    lines: lines.map((l) => l.line),
    offers,
    settings,
    shipping: zone ? { fee: zone.price, freeThreshold: zone.isPickup ? 0 : zone.freeThreshold } : null,
    coupon,
    firstOrder: first,
    pointsBalance: balance,
    usePoints: Boolean(req.usePoints) && Boolean(signedInId),
    giftCardBalance,
  });
  return {
    ...q,
    couponError: couponError ?? couponIssueCode(q.couponIssue),
    giftCardError,
    giftCardBalance,
    zone,
    pointsBalance: balance,
    pointValue: settings.pointValue,
    firstOrder: first,
    items: lines.map((l) => ({
      key: l.line.key,
      productId: l.product.id,
      variantId: l.variant?.id ?? null,
      slug: l.product.slug,
      name: l.product.name,
      variantName: l.variant?.name ?? null,
      imageUrl: l.product.imageUrl,
      art: l.product.art,
      kind: l.product.kind,
    })),
  };
}

/* ───────────── Place order ───────────── */

export type PlaceOrderInput = QuoteRequest & {
  signedInId: string | null;
  contact: { name: string; phone: string; email?: string | null };
  address?: { city: string; street: string; notes?: string } | null;
  method: PaymentMethod;
  lang: Locale;
  note?: string;
  birthday?: string | null;
  marketingConsent?: boolean;
  saveAddress?: boolean;
  source?: string | null;
  campaign?: string | null;
};

export type PlacedOrder = { id: string; number: number; total: number; quote: Quote; customerId: string; paid: boolean };

/** Creates the order atomically (stock, points, coupon and gift card are all reserved together). */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) throw new CheckoutError("invalid_method");
  const name = clean(input.contact?.name, 80);
  const phone = clean(input.contact?.phone, 30);
  if (name.length < 2) throw new CheckoutError("invalid_name");
  if (!normalizePhone(phone)) throw new CheckoutError("invalid_phone");
  const email = clean(input.contact?.email, 200);
  if (email && !EMAIL.test(email)) throw new CheckoutError("invalid_email");

  return sql().begin(async (tx) => {
    const customerId = await upsertCustomer(tx, { name, phone, email, lang: input.lang, birthday: input.birthday, marketingConsent: input.marketingConsent, source: input.source }, input.signedInId);
    // Serialize this customer's checkouts so points, coupons and gift cards can't be spent twice.
    await tx`select id from profiles where id = ${customerId} for update`;

    const lines = await loadLines(input.cart, tx, true);
    const needsShipping = lines.some((l) => l.product.kind !== "gift_card");
    const [settings, offers, zones] = await Promise.all([getSettings(tx), activeOffers(tx), listZones(tx)]);
    let zone: Zone | null = null;
    let ship = { city: null as string | null, street: null as string | null, notes: null as string | null };
    if (needsShipping) {
      zone = zones.find((z) => z.id === input.zoneId) ?? null;
      if (!zone) throw new CheckoutError("invalid_zone");
      ship = { city: clean(input.address?.city, 80) || null, street: clean(input.address?.street, 160) || null, notes: clean(input.address?.notes, 300) || null };
      if (!zone.isPickup && ((ship.city ?? "").length < 2 || (ship.street ?? "").length < 2)) throw new CheckoutError("invalid_shipping");
    }

    const usePoints = Boolean(input.usePoints) && Boolean(input.signedInId);
    const balance = usePoints ? await pointsBalance(customerId, tx) : 0;
    const first = await isFirstOrder(customerId, tx);
    const coupon = input.couponCode?.trim() ? await validateCoupon(input.couponCode, customerId, tx, true) : null;
    const gift = input.giftCardCode?.trim() ? await findGiftCard(input.giftCardCode, tx, true) : null;

    const q = quote({
      lines: lines.map((l) => l.line),
      offers,
      settings,
      shipping: zone ? { fee: zone.price, freeThreshold: zone.isPickup ? 0 : zone.freeThreshold } : null,
      coupon: coupon?.rule ?? null,
      firstOrder: first,
      pointsBalance: balance,
      usePoints,
      giftCardBalance: gift?.balance ?? 0,
    });
    if (coupon && q.couponIssue) throw new CheckoutError(couponIssueCode(q.couponIssue)!);

    const paid = q.total === 0;
    const status: OrderStatus = input.method === "cash" || paid ? "received" : "awaiting_payment";
    const source = coupon?.source ?? clean(input.source, 60) ?? null;

    const [order] = await tx`
      insert into orders (user_id, status, payment_method, payment_status, subtotal, discount_kind, discount_code, discount_amount,
        points_used, points_value, shipping_fee, total, points_earned, ship_name, ship_phone, ship_city, ship_street, ship_notes, lang,
        zone_id, zone_name, customer_note, source, campaign, sale_savings, gift_card_amount, needs_shipping)
      values (${customerId}, ${status}, ${input.method}, ${paid ? "paid" : "pending"}, ${q.subtotal}, ${q.discountKind}, ${q.discountCode}, ${q.discountAmount},
        ${q.pointsUsed}, ${q.pointsValue}, ${q.shippingFee}, ${q.total}, ${q.pointsEarned}, ${name}, ${phone}, ${ship.city}, ${ship.street}, ${ship.notes}, ${input.lang},
        ${zone?.id ?? null}, ${zone ? localized(zone.name, input.lang) : null}, ${clean(input.note, 500) || null}, ${source || null}, ${clean(input.campaign, 80) || null},
        ${q.saleSavings}, ${q.giftCardApplied}, ${needsShipping})
      returning id, number`;
    const orderId = String(order.id);

    for (const l of lines) {
      const p = q.lines.find((x) => x.key === l.line.key)!;
      await tx`
        insert into order_items (order_id, product_id, variant_id, name, variant_name, unit_price, list_price, quantity, line_total, is_gift_card)
        values (${orderId}, ${l.product.id}, ${l.variant?.id ?? null}, ${localized(l.product.name, input.lang)}, ${l.variant ? localized(l.variant.name, input.lang) : null},
          ${round2(p.lineTotal / l.qty)}, ${l.line.listPrice}, ${l.qty}, ${p.lineTotal}, ${l.line.giftCard})`;
      if (l.variant) await tx`update product_variants set stock = stock - ${l.qty} where id = ${l.variant.id} and stock is not null`;
      else await tx`update products set stock = stock - ${l.qty} where id = ${l.product.id} and stock is not null`;
    }
    await tx`insert into order_events (order_id, status, actor) values (${orderId}, ${status}, 'customer')`;

    if (q.pointsUsed > 0) await spendPoints(tx, customerId, q.pointsUsed, "redeemed", orderId);
    if (coupon && q.discountKind === "coupon") {
      await tx`insert into coupon_redemptions (coupon_id, user_id, order_id, discount_amount) values (${coupon.id}, ${customerId}, ${orderId}, ${q.discountAmount})`;
      await tx`update coupons set used_count = used_count + 1 where id = ${coupon.id}`;
    }
    if (gift && q.giftCardApplied > 0) {
      await tx`update gift_cards set balance = balance - ${q.giftCardApplied} where id = ${gift.id}`;
      await tx`insert into gift_card_transactions (gift_card_id, order_id, amount) values (${gift.id}, ${orderId}, ${-q.giftCardApplied})`;
    }
    if (input.saveAddress && input.signedInId && zone && !zone.isPickup && ship.city && ship.street) {
      const [exists] = await tx`select 1 from addresses where user_id = ${customerId} and city = ${ship.city} and street = ${ship.street} limit 1`;
      if (!exists) {
        const [count] = await tx`select count(*)::int as c from addresses where user_id = ${customerId}`;
        await tx`
          insert into addresses (user_id, recipient, phone, city, street, notes, is_default)
          values (${customerId}, ${name}, ${phone}, ${ship.city}, ${ship.street}, ${ship.notes}, ${Number(count.c) === 0})`;
      }
    }
    await tx`update carts set recovered_order_id = ${orderId}, items = '[]', updated_at = now() where customer_id = ${customerId}`;
    if (paid) {
      await issueGiftCards(tx, orderId);
      await completeDigital(tx, orderId);
    }

    return { id: orderId, number: Number(order.number), total: q.total, quote: q, customerId, paid };
  });
}

/* ───────────── Gift cards ───────────── */

function newGiftCode(): string {
  let s = "";
  for (let i = 0; i < 12; i++) s += GIFT_ALPHABET[randomInt(GIFT_ALPHABET.length)];
  return s;
}

export type IssuedGiftCard = { code: string; value: number; expiresAt: string | null };

/** Creates the gift cards bought in a paid order (once). */
async function issueGiftCards(tx: Tx, orderId: string): Promise<IssuedGiftCard[]> {
  const [done] = await tx`select 1 from gift_cards where order_id = ${orderId} limit 1`;
  if (done) return [];
  const items = await tx`select i.unit_price, i.quantity, o.user_id from order_items i join orders o on o.id = i.order_id where i.order_id = ${orderId} and i.is_gift_card`;
  if (items.length === 0) return [];
  const s = await getSettings(tx);
  const out: IssuedGiftCard[] = [];
  for (const it of items) {
    for (let k = 0; k < Number(it.quantity); k++) {
      const paid = n(it.unit_price);
      const value = round2(paid * (1 + s.giftCardBonusPct / 100));
      const [g] = await tx`
        insert into gift_cards (code, paid_amount, initial_value, balance, expires_at, purchaser_id, order_id)
        values (${newGiftCode()}, ${paid}, ${value}, ${value},
          ${s.giftCardValidMonths ? tx`now() + make_interval(months => ${s.giftCardValidMonths})` : null}, ${it.user_id as string}, ${orderId})
        returning code, expires_at`;
      out.push({ code: String(g.code), value, expiresAt: g.expires_at ? new Date(String(g.expires_at)).toISOString() : null });
    }
  }
  return out;
}

/** Gift-card-only orders have nothing to ship: once paid they are complete. */
async function completeDigital(tx: Tx, orderId: string) {
  const [o] = await tx`select needs_shipping, payment_status, status from orders where id = ${orderId}`;
  if (!o || o.needs_shipping || o.payment_status !== "paid" || o.status === "delivered" || o.status === "cancelled") return;
  await tx`update orders set status = 'delivered', updated_at = now() where id = ${orderId}`;
  await tx`insert into order_events (order_id, status, note, actor) values (${orderId}, 'delivered', 'gift card sent', 'system')`;
}

/* ───────────── Status changes ───────────── */

export type StatusChange = { orderId: string; from: OrderStatus; to: OrderStatus; customerId: string; pointsAwarded: number; giftCards: IssuedGiftCard[] };

/** Moves an order to a new status: awards points on delivery; cancelling returns stock, points, coupon and gift card balance. */
export async function setOrderStatus(orderId: string, status: OrderStatus, opts: { note?: string; actor?: string } = {}): Promise<StatusChange | null> {
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) throw new CheckoutError("invalid_status");
  return sql().begin(async (tx) => {
    const [o] = await tx`select * from orders where id = ${orderId} for update`;
    if (!o) throw new CheckoutError("order_not_found");
    if (o.status === status) return null;
    if (o.status === "cancelled") throw new CheckoutError("order_cancelled");
    const customerId = String(o.user_id);
    const settings = await getSettings(tx);
    let pointsAwarded = 0;
    let giftCards: IssuedGiftCard[] = [];

    if (status === "delivered") {
      if (!o.points_awarded && Number(o.points_earned) > 0) {
        await addPoints(tx, customerId, Number(o.points_earned), "earned", orderId, settings.pointsExpiryMonths);
        await tx`update orders set points_awarded = true where id = ${orderId}`;
        pointsAwarded = Number(o.points_earned);
      }
      if (o.payment_method === "cash" && o.payment_status === "pending") {
        await tx`update orders set payment_status = 'paid' where id = ${orderId}`;
        giftCards = await issueGiftCards(tx, orderId);
      }
    }

    if (status === "cancelled") {
      const items = await tx`select product_id, variant_id, quantity from order_items where order_id = ${orderId}`;
      for (const it of items) {
        if (it.variant_id) await tx`update product_variants set stock = stock + ${Number(it.quantity)} where id = ${it.variant_id as string} and stock is not null`;
        else if (it.product_id) await tx`update products set stock = stock + ${Number(it.quantity)} where id = ${it.product_id as string} and stock is not null`;
      }
      if (Number(o.points_used) > 0) await addPoints(tx, customerId, Number(o.points_used), "refund", orderId, settings.pointsExpiryMonths);
      if (o.points_awarded && Number(o.points_earned) > 0) {
        await spendPoints(tx, customerId, Number(o.points_earned), "adjust", orderId);
        await tx`update orders set points_awarded = false where id = ${orderId}`;
      }
      const redeemed = await tx`delete from coupon_redemptions where order_id = ${orderId} returning coupon_id`;
      for (const r of redeemed) await tx`update coupons set used_count = greatest(used_count - 1, 0) where id = ${r.coupon_id as string}`;
      const spent = await tx`select gift_card_id, sum(amount) as amount from gift_card_transactions where order_id = ${orderId} group by gift_card_id`;
      for (const g of spent) {
        const back = -n(g.amount);
        if (back <= 0) continue;
        await tx`update gift_cards set balance = balance + ${back} where id = ${g.gift_card_id as string}`;
        await tx`insert into gift_card_transactions (gift_card_id, order_id, amount) values (${g.gift_card_id as string}, ${orderId}, ${back})`;
      }
      // Gift cards bought in this order stop working.
      await tx`update gift_cards set disabled = true where order_id = ${orderId}`;
    }

    await tx`update orders set status = ${status}, updated_at = now() where id = ${orderId}`;
    await tx`insert into order_events (order_id, status, note, actor) values (${orderId}, ${status}, ${opts.note ?? null}, ${opts.actor ?? null})`;
    return { orderId, from: o.status as OrderStatus, to: status, customerId, pointsAwarded, giftCards };
  });
}

/** Records a successful payment (PayPlus callback or staff). Issues bought gift cards. */
export async function markPaid(orderId: string, transactionUid?: string | null, invoice?: { number?: string | null; url?: string | null }, actor?: string): Promise<{ wasAwaiting: boolean; giftCards: IssuedGiftCard[] } | null> {
  return sql().begin(async (tx) => {
    const [o] = await tx`select status, payment_status from orders where id = ${orderId} for update`;
    if (!o || o.status === "cancelled") return null;
    if (invoice?.number || invoice?.url) {
      await tx`update orders set invoice_number = coalesce(${invoice.number ?? null}, invoice_number), invoice_url = coalesce(${invoice.url ?? null}, invoice_url) where id = ${orderId}`;
    }
    if (o.payment_status === "paid") return null;
    await tx`
      update orders set payment_status = 'paid', payplus_transaction_uid = coalesce(${transactionUid ?? null}, payplus_transaction_uid),
        status = case when status = 'awaiting_payment' then 'received' else status end, updated_at = now()
      where id = ${orderId}`;
    const wasAwaiting = o.status === "awaiting_payment";
    if (wasAwaiting) await tx`insert into order_events (order_id, status, note, actor) values (${orderId}, 'received', 'paid', ${actor ?? "payplus"})`;
    const giftCards = await issueGiftCards(tx, orderId);
    await completeDigital(tx, orderId);
    return { wasAwaiting, giftCards };
  });
}

export async function setTracking(orderId: string, carrierId: string | null, trackingNumber: string, actor: string): Promise<void> {
  const num = trackingNumber.trim().slice(0, 80);
  await sql().begin(async (tx) => {
    const [c] = carrierId ? await tx`select * from carriers where id = ${carrierId}` : [];
    const url = c?.tracking_url && num ? String(c.tracking_url).replace("{number}", encodeURIComponent(num)) : null;
    await tx`
      update orders set carrier_id = ${c ? (c.id as string) : null}, carrier_name = ${c ? (c.name as string) : null},
        tracking_number = ${num || null}, tracking_url = ${url}, updated_at = now()
      where id = ${orderId}`;
    await tx`insert into audit_log (actor, action, entity, entity_id, details) values (${actor}, 'tracking', 'order', ${orderId}, ${tx.json({ carrier: c?.name ?? null, number: num })})`;
  });
}

/** Cancels card/Bit/Apple Pay orders that were never paid (returns their stock). */
export async function cancelStaleUnpaid(): Promise<number> {
  const s = await getSettings();
  const rows = await sql()`select id from orders where status = 'awaiting_payment' and created_at < now() - make_interval(hours => ${s.unpaidCancelHours})`;
  for (const r of rows) await setOrderStatus(String(r.id), "cancelled", { note: "unpaid", actor: "system" });
  return rows.length;
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

export type OrderItem = { productId: string | null; variantId: string | null; name: string; variantName: string | null; unitPrice: number; listPrice: number | null; quantity: number; lineTotal: number; isGiftCard: boolean };

export type OrderDetail = OrderSummary & {
  subtotal: number;
  saleSavings: number;
  discountKind: string | null;
  discountCode: string | null;
  discountAmount: number;
  pointsUsed: number;
  pointsValue: number;
  giftCardAmount: number;
  shippingFee: number;
  pointsEarned: number;
  pointsAwarded: boolean;
  needsShipping: boolean;
  zoneName: string | null;
  ship: { name: string; phone: string; city: string | null; street: string | null; notes: string | null };
  customerNote: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  source: string | null;
  campaign: string | null;
  items: OrderItem[];
  events: { status: string; note: string | null; actor: string | null; createdAt: string }[];
  giftCards: { code: string; value: number; balance: number; expiresAt: string | null; disabled: boolean }[];
  lang: Locale;
  userEmail?: string;
  userPhone?: string;
  userId: string;
};

const isoOf = (v: unknown) => new Date(String(v)).toISOString();

function summary(o: Row): OrderSummary {
  return {
    id: String(o.id),
    number: Number(o.number),
    status: o.status as OrderStatus,
    paymentMethod: o.payment_method as PaymentMethod,
    paymentStatus: String(o.payment_status),
    total: n(o.total),
    createdAt: isoOf(o.created_at),
    itemCount: Number(o.item_count ?? 0),
  };
}

export async function listOrders(customerId: string): Promise<OrderSummary[]> {
  const rows = await sql()`
    select o.*, (select coalesce(sum(quantity), 0) from order_items i where i.order_id = o.id)::int as item_count
    from orders o where o.user_id = ${customerId} order by o.created_at desc`;
  return rows.map(summary);
}

async function detail(o: Row | undefined): Promise<OrderDetail | null> {
  if (!o) return null;
  const db = sql();
  const [items, events, cards] = await Promise.all([
    db`select * from order_items where order_id = ${o.id as string} order by is_gift_card, name`,
    db`select * from order_events where order_id = ${o.id as string} order by created_at, id`,
    db`select * from gift_cards where order_id = ${o.id as string} order by created_at`,
  ]);
  return {
    ...summary({ ...o, item_count: items.reduce((s, i) => s + Number(i.quantity), 0) }),
    subtotal: n(o.subtotal),
    saleSavings: n(o.sale_savings),
    discountKind: (o.discount_kind as string | null) ?? null,
    discountCode: (o.discount_code as string | null) ?? null,
    discountAmount: n(o.discount_amount),
    pointsUsed: Number(o.points_used),
    pointsValue: n(o.points_value),
    giftCardAmount: n(o.gift_card_amount),
    shippingFee: n(o.shipping_fee),
    pointsEarned: Number(o.points_earned),
    pointsAwarded: Boolean(o.points_awarded),
    needsShipping: o.needs_shipping !== false,
    zoneName: (o.zone_name as string | null) ?? null,
    ship: { name: String(o.ship_name), phone: String(o.ship_phone), city: (o.ship_city as string | null) ?? null, street: (o.ship_street as string | null) ?? null, notes: (o.ship_notes as string | null) ?? null },
    customerNote: (o.customer_note as string | null) ?? null,
    carrierName: (o.carrier_name as string | null) ?? null,
    trackingNumber: (o.tracking_number as string | null) ?? null,
    trackingUrl: (o.tracking_url as string | null) ?? null,
    invoiceNumber: (o.invoice_number as string | null) ?? null,
    invoiceUrl: (o.invoice_url as string | null) ?? null,
    source: (o.source as string | null) ?? null,
    campaign: (o.campaign as string | null) ?? null,
    items: items.map((i) => ({
      productId: i.product_id ? String(i.product_id) : null,
      variantId: i.variant_id ? String(i.variant_id) : null,
      name: String(i.name),
      variantName: (i.variant_name as string | null) ?? null,
      unitPrice: n(i.unit_price),
      listPrice: i.list_price === null ? null : n(i.list_price),
      quantity: Number(i.quantity),
      lineTotal: n(i.line_total),
      isGiftCard: Boolean(i.is_gift_card),
    })),
    events: events.map((e) => ({ status: String(e.status), note: (e.note as string | null) ?? null, actor: (e.actor as string | null) ?? null, createdAt: isoOf(e.created_at) })),
    giftCards: cards.map((g) => ({ code: formatGiftCode(String(g.code)), value: n(g.initial_value), balance: n(g.balance), expiresAt: g.expires_at ? isoOf(g.expires_at) : null, disabled: Boolean(g.disabled) })),
    lang: o.lang as Locale,
    userEmail: (o.email as string | undefined) ?? undefined,
    userPhone: (o.phone_norm as string | undefined) ?? undefined,
    userId: String(o.user_id),
  };
}

/** A customer's own order by its number (never another customer's). */
export async function getOrderForUser(customerId: string, number: number): Promise<OrderDetail | null> {
  const [o] = await sql()`select * from orders where user_id = ${customerId} and number = ${number}`;
  return detail(o);
}

export async function getOrderByNumber(number: number): Promise<OrderDetail | null> {
  const [o] = await sql()`select o.*, p.email, p.phone_norm from orders o join profiles p on p.id = o.user_id where o.number = ${number}`;
  return detail(o);
}

export async function getOrderById(id: string): Promise<OrderDetail | null> {
  const [o] = await sql()`select o.*, p.email, p.phone_norm from orders o join profiles p on p.id = o.user_id where o.id = ${id}`;
  return detail(o);
}

export async function savePaymentRequest(orderId: string, pageRequestUid: string | null): Promise<void> {
  await sql()`update orders set payplus_page_request_uid = ${pageRequestUid} where id = ${orderId}`;
}
