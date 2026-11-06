/* Order constants shared by server code and client components (no database imports here). */

export const ORDER_STATUSES = ["awaiting_payment", "received", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const PAYMENT_METHODS = ["card", "bit", "apple_pay", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const ACTIVE_STATUSES: OrderStatus[] = ["awaiting_payment", "received", "preparing", "shipped", "out_for_delivery"];
