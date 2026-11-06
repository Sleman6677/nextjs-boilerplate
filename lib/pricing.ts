/**
 * Order pricing rules (pure; the server is the only place totals are computed).
 *
 * 1. Item price: the lowest of the list price, an active product sale price, and any automatic
 *    offer the item qualifies for (offers never stack with each other or with the sale price).
 *    An add-on ("add the tweezers at a special price") gets its special price for as many units
 *    as there are units of its main product in the cart.
 * 2. One discount on top: a coupon (including birthday and personal codes) OR the first-order
 *    discount. A valid coupon replaces the first-order discount. Coupons can be limited to
 *    products/groups and can skip items that are already on sale.
 * 3. Shipping by zone; free when the goods after the discount reach the zone's (or the general)
 *    threshold. Orders with only gift cards ship nothing.
 * 4. Points pay for goods only (not shipping, not gift cards).
 * 5. A gift card pays for goods and shipping, never for other gift cards.
 * 6. Points earned = earn% of the money actually paid for goods (gift-card items never earn).
 */

export type Settings = {
  shippingFee: number;
  freeShippingThreshold: number | null;
  firstOrderDiscountPct: number;
  pointsEarnPct: number;
  pointValue: number; // ₪ per point
};

export type PriceLine = {
  key: string;
  productId: string;
  categoryId: string | null;
  qty: number;
  listPrice: number;
  salePrice: number | null; // active product sale price
  giftCard: boolean;
  addonPrice: number | null; // special price while the main product is in the cart
  addonQty: number; // units allowed at the add-on price
};

export type OfferRule = {
  id: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  minQty: number;
};

export type CouponRule = {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  scope: "all" | "products" | "categories";
  productIds: string[];
  categoryIds: string[];
  excludeSale: boolean;
};

export type ShippingRule = { fee: number; freeThreshold: number | null };

export type QuoteInput = {
  lines: PriceLine[];
  offers: OfferRule[];
  settings: Settings;
  shipping: ShippingRule | null; // null = zone not chosen yet
  coupon: CouponRule | null;
  firstOrder: boolean;
  pointsBalance: number;
  usePoints: boolean;
  giftCardBalance: number;
};

export type PricedLine = {
  key: string;
  qty: number;
  listPrice: number;
  unitPrice: number; // price per unit before add-on units
  lineTotal: number;
  onSale: boolean;
  offerId: string | null;
  offerLabel: string | null;
  addonUnits: number;
};

export type Quote = {
  lines: PricedLine[];
  listSubtotal: number;
  saleSavings: number;
  subtotal: number; // after item prices (sale/offers), before the discount
  goodsSubtotal: number; // subtotal without gift cards
  discountKind: "coupon" | "first_order" | null;
  discountCode: string | null;
  discountPct: number | null;
  discountAmount: number;
  couponIssue: "min_subtotal" | "not_applicable" | null;
  needsShipping: boolean;
  shippingKnown: boolean;
  shippingFee: number;
  freeShippingRemaining: number | null;
  pointsAvailable: number;
  pointsUsed: number;
  pointsValue: number;
  giftCardApplied: number;
  total: number;
  pointsEarned: number;
};

export const round2 = (x: number) => Math.round(x * 100) / 100;

const inScope = (rule: { scope: string; productIds: string[]; categoryIds: string[] }, line: Pick<PriceLine, "productId" | "categoryId">) =>
  rule.scope === "all" || (rule.scope === "products" && rule.productIds.includes(line.productId)) || (rule.scope === "categories" && line.categoryId !== null && rule.categoryIds.includes(line.categoryId));

const offerPrice = (o: OfferRule, list: number) => round2(Math.max(0, o.kind === "percent" ? list * (1 - o.value / 100) : list - o.value));

/** Offers that cover a product (for badges like "3 for less"). */
export function offersFor<T extends OfferRule>(product: { productId: string; categoryId: string | null }, offers: T[]): T[] {
  return offers.filter((o) => inScope(o, product));
}

/** Best single-unit price for a product shown on its own (cards, product page): sale price or 1-item offers. */
export function displayPrice(line: Pick<PriceLine, "productId" | "categoryId" | "listPrice" | "salePrice" | "giftCard">, offers: OfferRule[]): { price: number; offer: OfferRule | null } {
  if (line.giftCard) return { price: line.listPrice, offer: null };
  let price = line.salePrice !== null ? Math.min(line.salePrice, line.listPrice) : line.listPrice;
  let offer: OfferRule | null = null;
  const full = { ...line, key: "", qty: 1, addonPrice: null, addonQty: 0 };
  for (const o of offers) {
    if (o.minQty > 1 || !inScope(o, full)) continue;
    const p = offerPrice(o, line.listPrice);
    if (p < price) {
      price = p;
      offer = o;
    }
  }
  return { price: round2(price), offer };
}

export function quote(input: QuoteInput): Quote {
  const { lines, offers, settings, shipping, coupon, firstOrder, pointsBalance, usePoints, giftCardBalance } = input;
  const goods = lines.filter((l) => !l.giftCard);
  const eligibleQty = new Map(offers.map((o) => [o.id, goods.filter((l) => inScope(o, l)).reduce((s, l) => s + l.qty, 0)]));

  const priced: PricedLine[] = lines.map((l) => {
    if (l.giftCard) {
      const lineTotal = round2(l.listPrice * l.qty);
      return { key: l.key, qty: l.qty, listPrice: l.listPrice, unitPrice: l.listPrice, lineTotal, onSale: false, offerId: null, offerLabel: null, addonUnits: 0 };
    }
    let unit = l.listPrice;
    let offerId: string | null = null;
    let offerLabel: string | null = null;
    if (l.salePrice !== null && l.salePrice < unit) unit = l.salePrice;
    for (const o of offers) {
      if (!inScope(o, l) || (eligibleQty.get(o.id) ?? 0) < o.minQty) continue;
      const p = offerPrice(o, l.listPrice);
      if (p < unit) {
        unit = p;
        offerId = o.id;
        offerLabel = o.label;
      }
    }
    unit = round2(unit);
    const addonUnits = l.addonPrice !== null && l.addonPrice < unit ? Math.min(l.qty, Math.max(0, l.addonQty)) : 0;
    const lineTotal = round2(unit * (l.qty - addonUnits) + (l.addonPrice ?? 0) * addonUnits);
    return { key: l.key, qty: l.qty, listPrice: l.listPrice, unitPrice: unit, lineTotal, onSale: lineTotal < round2(l.listPrice * l.qty), offerId, offerLabel, addonUnits };
  });

  const byKey = new Map(priced.map((p) => [p.key, p]));
  const listSubtotal = round2(lines.reduce((s, l) => s + l.listPrice * l.qty, 0));
  const subtotal = round2(priced.reduce((s, p) => s + p.lineTotal, 0));
  const saleSavings = round2(listSubtotal - subtotal);
  const goodsSubtotal = round2(goods.reduce((s, l) => s + byKey.get(l.key)!.lineTotal, 0));
  const giftItems = round2(subtotal - goodsSubtotal);

  // One discount: coupon, else first order.
  let discountKind: Quote["discountKind"] = null;
  let discountCode: string | null = null;
  let discountPct: number | null = null;
  let discountAmount = 0;
  let couponIssue: Quote["couponIssue"] = null;
  if (coupon) {
    const eligible = round2(goods.filter((l) => inScope(coupon, l) && !(coupon.excludeSale && byKey.get(l.key)!.onSale)).reduce((s, l) => s + byKey.get(l.key)!.lineTotal, 0));
    if (goodsSubtotal < coupon.minSubtotal) couponIssue = "min_subtotal";
    else if (eligible <= 0) couponIssue = "not_applicable";
    else {
      discountKind = "coupon";
      discountCode = coupon.code;
      if (coupon.kind === "percent") {
        discountPct = coupon.value;
        discountAmount = round2((eligible * coupon.value) / 100);
      } else discountAmount = round2(Math.min(coupon.value, eligible));
    }
  }
  if (!discountKind && firstOrder && settings.firstOrderDiscountPct > 0 && goodsSubtotal > 0) {
    discountKind = "first_order";
    discountPct = settings.firstOrderDiscountPct;
    discountAmount = round2((goodsSubtotal * settings.firstOrderDiscountPct) / 100);
  }
  const goodsAfterDiscount = round2(goodsSubtotal - discountAmount);

  // Shipping
  const needsShipping = goods.length > 0;
  const threshold = shipping ? (shipping.freeThreshold ?? settings.freeShippingThreshold) : settings.freeShippingThreshold;
  const free = threshold !== null && goodsAfterDiscount >= threshold;
  const shippingFee = !needsShipping || !shipping || free ? 0 : round2(shipping.fee);
  const freeShippingRemaining = needsShipping && threshold !== null && !free ? round2(threshold - goodsAfterDiscount) : null;

  // Points (goods only)
  const balance = Math.max(0, Math.floor(pointsBalance));
  const pointsAvailable = Math.min(balance, Math.floor(goodsAfterDiscount / settings.pointValue));
  const pointsUsed = usePoints ? pointsAvailable : 0;
  const pointsValue = round2(pointsUsed * settings.pointValue);

  // Gift card (goods + shipping, never gift-card items)
  const goodsDue = round2(goodsAfterDiscount - pointsValue);
  const giftCardApplied = round2(Math.min(Math.max(0, giftCardBalance), goodsDue + shippingFee));
  const giftOnGoods = Math.min(giftCardApplied, goodsDue);

  const total = round2(goodsDue + shippingFee - giftCardApplied + giftItems);
  const moneyOnGoods = Math.max(0, round2(goodsDue - giftOnGoods));
  const pointsEarned = Math.floor((moneyOnGoods * settings.pointsEarnPct) / 100 / settings.pointValue);

  return {
    lines: priced,
    listSubtotal,
    saleSavings,
    subtotal,
    goodsSubtotal,
    discountKind,
    discountCode,
    discountPct,
    discountAmount,
    couponIssue,
    needsShipping,
    shippingKnown: !needsShipping || shipping !== null,
    shippingFee,
    freeShippingRemaining,
    pointsAvailable,
    pointsUsed,
    pointsValue,
    giftCardApplied,
    total,
    pointsEarned,
  };
}
