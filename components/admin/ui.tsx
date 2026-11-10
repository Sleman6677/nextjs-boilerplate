import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderStatus, PaymentMethod } from "@/lib/order-status";

/* Arabic labels for the owner panel (worded for the shop owner, not the customer). */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "بانتظار الدفع",
  received: "جديد",
  preparing: "قيد التجهيز",
  shipped: "تم الشحن",
  out_for_delivery: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};
export const METHOD_LABEL: Record<PaymentMethod, string> = { card: "بطاقة ائتمان", bit: "Bit", apple_pay: "Apple Pay", cash: "نقدًا عند الاستلام" };
export const PAYMENT_LABEL: Record<string, string> = { pending: "غير مدفوع", paid: "مدفوع", failed: "فشل الدفع", refunded: "مُسترد" };

const STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_payment: "bg-rose/20 text-rosewood",
  received: "bg-gold text-ink",
  preparing: "bg-gold/25 text-gold-deep",
  shipped: "bg-ink/10 text-cocoa",
  out_for_delivery: "bg-ink text-gold-soft",
  delivered: "bg-emerald-700/10 text-emerald-800",
  cancelled: "bg-rosewood/10 text-rosewood line-through decoration-rosewood/40",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PaymentPill({ method, status }: { method: PaymentMethod; status: string }) {
  const paid = status === "paid";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-taupe">
      <span className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-emerald-600" : status === "failed" ? "bg-rosewood" : "bg-mist"}`} aria-hidden="true" />
      {METHOD_LABEL[method]} · {PAYMENT_LABEL[status] ?? status}
    </span>
  );
}

export function PageHeader({ title, subtitle, action, back }: { title: string; subtitle?: ReactNode; action?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8">
      {back ? (
        <Link href={back.href} className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm text-taupe hover:text-cocoa">
          <span aria-hidden="true">→</span> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-naskh text-3xl text-cocoa sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-taupe">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-3xl border border-cocoa/10 bg-surface p-5 sm:p-6 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-cocoa">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl border border-dashed border-cocoa/20 p-10 text-center text-taupe">{children}</p>;
}

export function Notice({ children, tone = "ok" }: { children: ReactNode; tone?: "ok" | "warn" }) {
  return (
    <p role="status" className={`mb-6 rounded-2xl px-4 py-3 text-sm ${tone === "ok" ? "bg-emerald-700/10 text-emerald-900" : "bg-gold/20 text-gold-deep"}`}>
      {children}
    </p>
  );
}

export const field =
  "mt-1.5 block w-full rounded-2xl border border-cocoa/15 bg-white px-4 py-3 text-base text-cocoa placeholder:text-mist focus:border-gold-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";
export const labelClass = "text-sm font-medium text-cocoa";
export const hintClass = "mt-1 text-xs text-taupe";

export function NoAccess() {
  return <Empty>هذا القسم غير متاح لحسابك. يمكن لصاحب المتجر تعديل الصلاحيات من «الطاقم».</Empty>;
}
