import Link from "next/link";
import type { AdminOrder } from "@/lib/admin";
import { shekel, when } from "@/lib/admin-format";
import { PaymentPill, StatusPill } from "./ui";

export function OrderList({ orders }: { orders: AdminOrder[] }) {
  return (
    <ul className="divide-y divide-cocoa/10 overflow-hidden rounded-3xl border border-cocoa/10 bg-surface">
      {orders.map((o) => (
        <li key={o.id}>
          <Link
            href={`/admin/orders/${o.number}`}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors duration-150 hover:bg-sand/40 focus-visible:bg-sand/40 sm:grid-cols-[5.5rem_1fr_auto_auto] sm:py-5"
          >
            <span className="font-display text-xl text-cocoa sm:text-2xl" dir="ltr">
              #{o.number}
            </span>
            <span className="order-3 col-span-2 min-w-0 sm:order-none sm:col-span-1">
              <span className="block truncate font-medium text-cocoa">
                {o.name}
                {o.city ? <span className="font-normal text-taupe"> · {o.city}</span> : null}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-taupe">
                <span>{when(o.createdAt)}</span>
                <span>{o.itemCount} قطعة</span>
                <PaymentPill method={o.paymentMethod} status={o.paymentStatus} />
              </span>
            </span>
            <span className="order-2 text-end font-semibold text-cocoa sm:order-none">{shekel(o.total)}</span>
            <span className="order-4 col-span-2 sm:order-none sm:col-span-1">
              <StatusPill status={o.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
