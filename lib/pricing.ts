/**
 * Order pricing rules (pure; the server is the only place totals are computed).
 *
 * - One discount per order: a coupon OR the first-order discount. A valid coupon replaces
 *   the first-order discount.
 * - Free shipping when the subtotal after the discount reaches the threshold.
 * - Points can be used together with the discount, but never pay for shipping.
 * - Points earned = earn% of what was paid for products (after discount and points).
 */

export type Settings = {
  shippingFee: number;
  freeShippingThreshold: number | null;
  firstOrderDiscountPct: number;
  pointsEarnPct: number;
  pointValue: number; // ₪ per point
};

export type CouponRule = { code: string; kind: "percent" | "fixed"; value: number; minSubtotal: number };

export type QuoteInput = {
  lines: { price: number; qty: number }[];
  settings: Settings;
  coupon: CouponRule | null;
  firstOrder: boolean;
  pointsBalance: number;
  usePoints: boolean;
};

export type Quote = {
  subtotal: number;
  discountKind: "coupon" | "first_order" | null;
  discountCode: string | null;
  discountPct: number | null;
  discountAmount: number;
  shippingFee: number;
  freeShippingRemaining: number | null; // ₪ left to reach free shipping (null = no threshold or already free)
  pointsAvailable: number; // usable on this order
  pointsUsed: number;
  pointsValue: number;
  total: number;
  pointsEarned: number;
};

export const round2 = (x: number) => Math.round(x * 100) / 100;

export function quote({ lines, settings, coupon, firstOrder, pointsBalance, usePoints }: QuoteInput): Quote {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.price * l.qty, 0));

  let discountKind: Quote["discountKind"] = null;
  let discountCode: string | null = null;
  let discountPct: number | null = null;
  let discountAmount = 0;

  if (coupon && subtotal >= coupon.minSubtotal) {
    discountKind = "coupon";
    discountCode = coupon.code;
    if (coupon.kind === "percent") {
      discountPct = coupon.value;
      discountAmount = round2((subtotal * coupon.value) / 100);
    } else {
      discountAmount = round2(Math.min(coupon.value, subtotal));
    }
  } else if (firstOrder && settings.firstOrderDiscountPct > 0 && subtotal > 0) {
    discountKind = "first_order";
    discountPct = settings.firstOrderDiscountPct;
    discountAmount = round2((subtotal * settings.firstOrderDiscountPct) / 100);
  }

  const afterDiscount = round2(subtotal - discountAmount);

  const threshold = settings.freeShippingThreshold;
  const freeShipping = threshold !== null && afterDiscount >= threshold;
  const shippingFee = subtotal === 0 || freeShipping ? 0 : round2(settings.shippingFee);
  const freeShippingRemaining = threshold !== null && !freeShipping && subtotal > 0 ? round2(threshold - afterDiscount) : null;

  const balance = Math.max(0, Math.floor(pointsBalance));
  const pointsAvailable = Math.min(balance, Math.floor(afterDiscount / settings.pointValue));
  const pointsUsed = usePoints ? pointsAvailable : 0;
  const pointsValue = round2(pointsUsed * settings.pointValue);

  const goodsPaid = round2(afterDiscount - pointsValue);
  const total = round2(goodsPaid + shippingFee);
  const pointsEarned = Math.floor((goodsPaid * settings.pointsEarnPct) / 100 / settings.pointValue);

  return {
    subtotal,
    discountKind,
    discountCode,
    discountPct,
    discountAmount,
    shippingFee,
    freeShippingRemaining,
    pointsAvailable,
    pointsUsed,
    pointsValue,
    total,
    pointsEarned,
  };
}
