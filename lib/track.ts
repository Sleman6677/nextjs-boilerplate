/* Shop events for Google Analytics 4 and Meta Pixel (no-ops when neither is configured). Client-only. */

type Item = { id: string; name: string; price: number; quantity?: number; variant?: string | null };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const ga = (event: string, params: Record<string, unknown>) => window.gtag?.("event", event, params);
const fb = (event: string, params: Record<string, unknown>) => window.fbq?.("track", event, params);
const gaItems = (items: Item[]) => items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity ?? 1, item_variant: i.variant ?? undefined }));
const value = (items: Item[]) => Math.round(items.reduce((s, i) => s + i.price * (i.quantity ?? 1), 0) * 100) / 100;

export function trackViewItem(item: Item) {
  ga("view_item", { currency: "ILS", value: item.price, items: gaItems([item]) });
  fb("ViewContent", { content_ids: [item.id], content_name: item.name, content_type: "product", value: item.price, currency: "ILS" });
}

export function trackAddToCart(item: Item) {
  ga("add_to_cart", { currency: "ILS", value: value([item]), items: gaItems([item]) });
  fb("AddToCart", { content_ids: [item.id], content_name: item.name, content_type: "product", value: value([item]), currency: "ILS" });
}

export function trackBeginCheckout(items: Item[], total: number) {
  ga("begin_checkout", { currency: "ILS", value: total, items: gaItems(items) });
  fb("InitiateCheckout", { content_ids: items.map((i) => i.id), num_items: items.reduce((s, i) => s + (i.quantity ?? 1), 0), value: total, currency: "ILS" });
}

export function trackPurchase(orderNumber: number, items: Item[], total: number) {
  ga("purchase", { transaction_id: String(orderNumber), currency: "ILS", value: total, items: gaItems(items) });
  fb("Purchase", { content_ids: items.map((i) => i.id), content_type: "product", value: total, currency: "ILS" });
}
