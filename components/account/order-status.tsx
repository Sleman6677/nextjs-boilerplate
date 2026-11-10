import type { Dictionary } from "@/lib/i18n";
import type { OrderStatus } from "@/lib/order-status";
import { Check, Close } from "../icons";

const FLOW: OrderStatus[] = ["received", "preparing", "shipped", "out_for_delivery", "delivered"];

export function StatusBadge({ status, dict }: { status: OrderStatus; dict: Dictionary }) {
  const tone =
    status === "delivered" ? "bg-gold/20 text-gold-deep" : status === "cancelled" ? "bg-rosewood/10 text-rosewood" : status === "awaiting_payment" ? "bg-rose/20 text-rosewood" : "bg-ink/5 text-cocoa";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{dict.order.statuses[status]}</span>;
}

/** Horizontal progress: received → preparing → shipped → out for delivery → delivered. */
export function StatusTracker({ status, dict }: { status: OrderStatus; dict: Dictionary }) {
  if (status === "cancelled") {
    return (
      <p className="flex items-center gap-3 rounded-2xl bg-rosewood/10 p-4 text-rosewood">
        <Close className="h-5 w-5" /> {dict.order.statuses.cancelled}
      </p>
    );
  }
  const reached = status === "awaiting_payment" ? -1 : FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1 sm:gap-2" aria-label={dict.account.timeline}>
      {FLOW.map((s, i) => {
        const done = i <= reached;
        return (
          <li key={s} className="flex flex-col items-center gap-2 text-center" aria-current={i === reached ? "step" : undefined}>
            <span className={`grid h-10 w-10 place-items-center rounded-full border-2 ${done ? "border-gold bg-gold text-ink" : "border-cocoa/15 bg-surface text-cocoa/30"}`}>
              {done ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
            </span>
            <span className={`text-xs leading-tight sm:text-sm ${done ? "text-cocoa" : "text-taupe"}`}>{dict.order.statuses[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}
