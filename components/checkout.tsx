"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { arDigits, payments, shop, site, whatsappLink, type LashBox } from "@/lib/site";
import { CardIcon, Check, Close, Copy, Mobile, WhatsApp } from "./icons";

type Line = { box: LashBox; qty: number };
type Method = "online" | "bit";
type Errors = Partial<Record<"name" | "phone" | "email" | "address", string>>;

/** Saved before redirecting to PayPlus so /shop/success and /shop/failure can show the order. */
export const ORDER_STORAGE_KEY = "serag-last-order";
export type SavedOrder = {
  ref: string;
  total: number;
  lines: { name: string; qty: number }[];
  name: string;
  phone: string;
  address: string;
};

const money = (n: number) => `${arDigits(n)} ${shop.currency}`;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(false), 1800);
    return () => window.clearTimeout(id);
  }, [done]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
        } catch {
          /* clipboard unavailable: the value is still visible to copy by hand */
        }
      }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-berry/25 bg-ivory px-3 text-xs font-semibold text-berry transition-colors duration-200 hover:border-berry"
      aria-label={label}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "نُسخ" : "نسخ"}
    </button>
  );
}

export function Checkout({
  lines,
  onClose,
  onSent,
  onlineReady,
}: {
  lines: Line[];
  onClose: () => void;
  onSent: () => void;
  /** True when PayPlus keys are configured on the server */
  onlineReady: boolean;
}) {
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const total = count * shop.boxPrice;

  const [method, setMethod] = useState<Method>(onlineReady ? "online" : "bit");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes, page scroll locks, focus moves into the dialog and back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const notes = String(data.get("notes") ?? "").trim();

    const next: Errors = {};
    if (name.length < 2) next.name = "اكتبي اسمكِ من فضلك";
    if (phone.replace(/\D/g, "").length < 7) next.phone = "أدخلي رقم هاتف صحيحًا";
    if (method === "online" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "أدخلي بريدًا إلكترونيًا صحيحًا لإيصال الدفع";
    if (address.length < 3) next.address = "اكتبي المدينة والعنوان للتوصيل";
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return;
    }

    if (method === "online") {
      setPending(true);
      try {
        const res = await fetch("/api/payplus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: lines.map((l) => ({ id: l.box.id, qty: l.qty })),
            customer: { name, phone, email, address, notes },
          }),
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string; ref?: string; total?: number; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error || "تعذّر فتح صفحة الدفع الآن");

        const saved: SavedOrder = {
          ref: json.ref ?? "",
          total: json.total ?? total,
          lines: lines.map((l) => ({ name: l.box.name, qty: l.qty })),
          name,
          phone,
          address,
        };
        try {
          sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(saved));
        } catch {
          /* storage unavailable: the success page simply shows a generic thank-you */
        }
        window.location.assign(json.url);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "تعذّر فتح صفحة الدفع الآن");
        setPending(false);
      }
      return;
    }

    const text = [
      `مرحبًا ${site.nameAr}، طلب جديد من المتجر:`,
      ...lines.map((l) => `• ${l.box.name} (${l.box.latin}) × ${l.qty}`),
      `عدد العلب: ${count}`,
      `المجموع: ${total} ${shop.currency}`,
      `طريقة الدفع: Bit — تحويل ${total} ${shop.currency} إلى ${payments.bit.display} (سأرفق صورة التحويل)`,
      "",
      `الاسم: ${name}`,
      `الهاتف: ${phone}`,
      `العنوان: ${address}`,
      notes ? `ملاحظات: ${notes}` : null,
    ]
      .filter((l) => l !== null)
      .join("\n");

    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
    setMessage(text);
    setSent(true);
  }

  const field =
    "mt-1.5 block w-full rounded-2xl border bg-ivory px-4 py-3 text-base text-plum placeholder:text-berry-deep/40 transition-colors duration-200 focus:border-berry focus:outline-none focus-visible:outline-2 focus-visible:outline-pink-deep";
  const border = (k: keyof Errors) => (errors[k] ? "border-berry" : "border-berry/15");

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="إغلاق" onClick={onClose} className="fade-in absolute inset-0 cursor-default bg-plum/60 backdrop-blur-sm" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="slide-up relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-petal shadow-[0_-30px_80px_-30px_rgba(44,13,28,0.6)] sm:max-w-xl sm:rounded-[2rem]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-berry/10 bg-petal/95 px-6 py-4 backdrop-blur">
          <h2 id="checkout-title" className="font-naskh text-2xl text-plum">
            {sent ? "تم تجهيز طلبكِ" : "إتمام الطلب"}
          </h2>
          <button type="button" onClick={onClose} aria-label="إغلاق نافذة الطلب" className="grid h-11 w-11 place-items-center rounded-full text-berry transition-colors hover:bg-pink-soft">
            <Close className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-10 text-center" role="status">
            <span className="pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-berry text-ivory">
              <Check className="h-7 w-7" />
            </span>
            <p className="font-display mt-6 text-3xl text-plum">شكرًا لكِ</p>
            <p className="mx-auto mt-3 max-w-sm leading-8 text-berry-deep/80">
              أرسلي الرسالة من واتساب وأرفقي صورة تحويل {money(total)} عبر Bit، وسنؤكد طلبكِ ونرتب التوصيل.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" className="btn btn-berry">
                <WhatsApp className="h-5 w-5" /> فتح واتساب
              </a>
              <button type="button" onClick={onSent} className="btn btn-ghost-dark">
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-7 px-6 py-6">
            {/* Summary */}
            <section aria-label="ملخص الطلب" className="rounded-2xl bg-ivory p-5">
              <ul className="space-y-2 text-plum">
                {lines.map((l) => (
                  <li key={l.box.id} className="flex items-center justify-between gap-3">
                    <span>
                      {l.box.name} <span className="text-berry-deep/60">× {arDigits(l.qty)}</span>
                    </span>
                    <span className="tabular-nums">{money(l.qty * shop.boxPrice)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center justify-between border-t border-berry/10 pt-4 text-lg font-semibold text-plum">
                <span>المجموع</span>
                <span className="font-display text-2xl">{money(total)}</span>
              </p>
            </section>

            {/* Payment method */}
            <fieldset>
              <legend className="mb-3 font-semibold text-plum">طريقة الدفع</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`relative ${onlineReady ? "" : "cursor-not-allowed"}`}>
                  <input type="radio" name="method" value="online" disabled={!onlineReady} checked={method === "online"} onChange={() => setMethod("online")} className="peer sr-only" />
                  <span className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-berry/15 bg-ivory px-4 py-3 transition-colors duration-200 peer-checked:border-berry peer-checked:bg-pink-soft/60 peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-deep">
                    <CardIcon className="h-6 w-6 shrink-0 text-berry" />
                    <span className="flex-1">
                      <span className="block font-semibold text-plum">فيزا / ماستركارد</span>
                      <span className="block text-xs text-berry-deep/70">{onlineReady ? "صفحة دفع آمنة عبر PayPlus" : "بطاقة ائتمان"}</span>
                    </span>
                    {!onlineReady && <span className="rounded-full bg-berry/10 px-2 py-0.5 text-[0.7rem] font-semibold text-berry">قريبًا</span>}
                  </span>
                </label>

                <label className="relative">
                  <input type="radio" name="method" value="bit" checked={method === "bit"} onChange={() => setMethod("bit")} className="peer sr-only" />
                  <span className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-berry/15 bg-ivory px-4 py-3 transition-colors duration-200 peer-checked:border-berry peer-checked:bg-pink-soft/60 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-deep">
                    <Mobile className="h-6 w-6 shrink-0 text-berry" />
                    <span>
                      <span className="block font-semibold text-plum" dir="ltr">Bit</span>
                      <span className="block text-xs text-berry-deep/70">تحويل من التطبيق</span>
                    </span>
                  </span>
                </label>
              </div>

              {method === "bit" && (
                <div className="mt-4 rounded-2xl border border-dashed border-berry/30 bg-ivory p-5">
                  <ol className="space-y-4 text-plum">
                    <li className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-berry text-sm text-ivory">١</span>
                      <span className="flex-1">
                        افتحي تطبيق <span dir="ltr" className="font-semibold">Bit</span> وحوّلي
                        <span className="mx-1 inline-flex flex-wrap items-center gap-2">
                          <span className="font-display text-xl text-berry">{money(total)}</span>
                          <CopyButton value={String(total)} label="نسخ المبلغ" />
                        </span>
                        إلى الرقم
                        <span className="mx-1 inline-flex flex-wrap items-center gap-2">
                          <span className="font-semibold tabular-nums" dir="ltr">{payments.bit.display}</span>
                          <CopyButton value={payments.bit.phone} label="نسخ رقم Bit" />
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-berry text-sm text-ivory">٢</span>
                      <span className="flex-1">اضغطي «إرسال الطلب» وأرفقي صورة التحويل في واتساب، ونؤكد لكِ الطلب.</span>
                    </li>
                  </ol>
                </div>
              )}

              {method === "online" && (
                <p className="mt-4 rounded-2xl bg-ivory p-4 text-sm leading-7 text-berry-deep/80">
                  ستنتقلين إلى صفحة الدفع الآمنة من PayPlus لإدخال البطاقة. لا تمرّ بيانات بطاقتكِ عبر موقعنا.
                </p>
              )}
            </fieldset>

            {/* Delivery details */}
            <fieldset className="space-y-4">
              <legend className="mb-1 font-semibold text-plum">بيانات التوصيل</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="co-name" className="text-sm text-berry-deep">الاسم</label>
                  <input id="co-name" name="name" autoComplete="name" className={`${field} ${border("name")}`} aria-invalid={!!errors.name} aria-describedby={errors.name ? "co-name-err" : undefined} />
                  {errors.name && <p id="co-name-err" className="mt-1.5 text-sm text-berry">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="co-phone" className="text-sm text-berry-deep">رقم الهاتف</label>
                  <input id="co-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={`${field} ${border("phone")} text-right`} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "co-phone-err" : undefined} />
                  {errors.phone && <p id="co-phone-err" className="mt-1.5 text-sm text-berry">{errors.phone}</p>}
                </div>
              </div>
              {method === "online" && (
                <div>
                  <label htmlFor="co-email" className="text-sm text-berry-deep">البريد الإلكتروني <span className="text-berry-deep/60">(لإيصال الدفع)</span></label>
                  <input id="co-email" name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" className={`${field} ${border("email")} text-right`} aria-invalid={!!errors.email} aria-describedby={errors.email ? "co-email-err" : undefined} />
                  {errors.email && <p id="co-email-err" className="mt-1.5 text-sm text-berry">{errors.email}</p>}
                </div>
              )}
              <div>
                <label htmlFor="co-address" className="text-sm text-berry-deep">المدينة والعنوان</label>
                <input id="co-address" name="address" autoComplete="street-address" className={`${field} ${border("address")}`} aria-invalid={!!errors.address} aria-describedby={errors.address ? "co-address-err" : undefined} />
                {errors.address && <p id="co-address-err" className="mt-1.5 text-sm text-berry">{errors.address}</p>}
              </div>
              <div>
                <label htmlFor="co-notes" className="text-sm text-berry-deep">
                  ملاحظات <span className="text-berry-deep/60">(اختياري)</span>
                </label>
                <input id="co-notes" name="notes" className={`${field} border-berry/15`} />
              </div>
            </fieldset>

            {serverError && (
              <p role="alert" className="rounded-2xl border border-berry/30 bg-ivory p-4 text-sm text-berry">
                {serverError}
              </p>
            )}

            <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-berry w-full text-base disabled:opacity-70">
              {method === "online" ? (
                <>
                  <CardIcon className="h-5 w-5" />
                  {pending ? "جارٍ فتح صفحة الدفع…" : `الدفع الآن · ${money(total)}`}
                </>
              ) : (
                <>
                  <WhatsApp className="h-5 w-5" />
                  إرسال الطلب · {money(total)}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
