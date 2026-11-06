/* Stock status shown to customers (client-safe). */

export type StockStatus = "in" | "low" | "out";

export type Stocked = { stock: number | null; lowStockThreshold: number; sellWhenOut: boolean; variants: { id: string; stock: number | null; active: boolean }[] };

/** Units available for one product or one of its options (null = not tracked / unlimited). */
export function available(p: Stocked, variantId?: string | null): number | null {
  const variants = p.variants.filter((v) => v.active);
  if (variants.length > 0) {
    if (variantId) return variants.find((v) => v.id === variantId)?.stock ?? null;
    if (variants.some((v) => v.stock === null)) return null;
    return variants.reduce((s, v) => s + Math.max(0, v.stock ?? 0), 0);
  }
  return p.stock;
}

export function stockStatus(p: Stocked, variantId?: string | null): StockStatus {
  const n = available(p, variantId);
  if (n === null) return "in";
  if (n <= 0) return p.sellWhenOut ? "in" : "out";
  return n <= p.lowStockThreshold ? "low" : "in";
}

/** Largest quantity a customer may put in the cart. */
export function maxQty(p: Stocked, variantId?: string | null): number {
  const n = available(p, variantId);
  if (n === null || p.sellWhenOut) return 20;
  return Math.max(0, Math.min(20, n));
}
