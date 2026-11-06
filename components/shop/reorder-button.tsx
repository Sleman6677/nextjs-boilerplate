"use client";

import { useRouter } from "next/navigation";
import { href } from "@/lib/i18n/config";
import { cart } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { toast } from "./toast";

/** Puts an earlier order's items back in the cart (the cart page checks what is still available). */
export function ReorderButton({ items, className = "" }: { items: { productId: string; variantId: string | null; quantity: number }[]; className?: string }) {
  const { lang, dict } = useI18n();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        for (const i of items) cart.add(i.productId, i.variantId, i.quantity);
        toast(dict.store.order.reordered);
        router.push(href(lang, "/cart"));
      }}
      className={`btn btn-ink ${className}`}
    >
      {dict.store.order.reorder}
    </button>
  );
}
