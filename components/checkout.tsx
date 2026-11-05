"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { money, num, t } from "@/lib/i18n/format";
import { payments, shop, whatsappLink, type LashBox } from "@/lib/site";
import { useI18n } from "./i18n-provider";
import { CardIcon, Check, Close, Copy, Mobile, WhatsApp } from "./icons";

type Line = { box: LashBox; qty: number };
type Method = "online" | "bit";
type Errors = Partial<Record<"name" | "phone" | "email" | "address", string>>;

/** Saved before redirecting to PayPlus so the success/failure pages can show the order. */
export const ORDER_STORAGE_KEY = "serag-last-order";
export type SavedOrder = {
  ref: string;
  total: number;
  lines: { name: string; qty: number }[];
  name: string;
  phone: string;
  address: string;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const { dict } = useI18n();
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
      {done ? dict.checkout.copied : dict.checkout.copy}
    </button>
  );
}

export function Checkout({ lines, onClose, onSent, onlineReady }: { lines: Line[]; onClose: () => void; onSent: () => void; onlineReady: boolean }) {
  const { lang, dict } = useI18n();
  const c = dict.checkout;
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const total = count * shop.boxPrice;
  const fmt = (n: number) => money(n, lang, shop.currency);
  const boxName = (b: LashBox) => dict.shop.boxes[b.id].name;

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
    if (name.length < 2) next.name = c.errName;
    if (phone.replace(/\D/g, "").length < 7) next.phone = c.errPhone;
    if (method === "online" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = c.errEmail;
    if (address.length < 3) next.address = c.errAddress;
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
          body: JSON.stringify({ items: lines.map((l) => ({ id: l.box.id, qty: l.qty })), customer: { name, phone, email, address, notes }, lang }),
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string; ref?: string; total?: number };
        if (!res.ok || !json.url) throw new Error("payment_link_failed");

        const saved: SavedOrder = { ref: json.ref ?? "", total: json.total ?? total, lines: lines.map((l) => ({ name: boxName(l.box), qty: l.qty })), name, phone, address };
        try {
          sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(saved));
        } catch {
          /* storage unavailable: the success page shows a generic thank-you */
        }
        window.location.assign(json.url);
      } catch {
        setServerError(c.errGeneric);
        setPending(false);
      }
      return;
    }

    const text = [
      t(c.msg.intro, { brand: dict.brand }),
      ...lines.map((l) => `• ${boxName(l.box)}${boxName(l.box) !== l.box.latin ? ` (${l.box.latin})` : ""} × ${l.qty}`),
      `${c.msg.count}: ${count}`,
      `${c.msg.total}: ${total} ${shop.currency}`,
      t(c.msg.bit, { total: `${total} ${shop.currency}`, phone: payments.bit.display }),
      "",
      `${c.msg.name}: ${name}`,
      `${c.msg.phone}: ${phone}`,
      `${c.msg.address}: ${address}`,
      notes ? `${c.msg.notes}: ${notes}` : null,
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
      <button type="button" aria-label={c.close} onClick={onClose} className="fade-in absolute inset-0 cursor-default bg-plum/60 backdrop-blur-sm" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        className="slide-up relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-petal shadow-[0_-30px_80px_-30px_rgba(44,13,28,0.6)] sm:max-w-xl sm:rounded-[2rem]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-berry/10 bg-petal/95 px-6 py-4 backdrop-blur">
          <h2 id="checkout-title" className="font-naskh text-2xl text-plum">
            {sent ? c.sentTitle : c.title}
          </h2>
          <button type="button" onClick={onClose} aria-label={c.closeDialog} className="grid h-11 w-11 place-items-center rounded-full text-berry transition-colors hover:bg-pink-soft">
            <Close className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-10 text-center" role="status">
            <span className="pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-berry text-ivory">
              <Check className="h-7 w-7" />
            </span>
            <p className="font-display mt-6 text-3xl text-plum">{c.thanks}</p>
            <p className="mx-auto mt-3 max-w-sm leading-8 text-berry-deep/80">{t(c.bitThanks, { total: fmt(total) })}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" className="btn btn-berry">
                <WhatsApp className="h-5 w-5" /> {c.openWa}
              </a>
              <button type="button" onClick={onSent} className="btn btn-ghost-dark">
                {c.close}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-7 px-6 py-6">
            <section aria-label={c.summary} className="rounded-2xl bg-ivory p-5">
              <ul className="space-y-2 text-plum">
                {lines.map((l) => (
                  <li key={l.box.id} className="flex items-center justify-between gap-3">
                    <span>
                      {boxName(l.box)} <span className="text-berry-deep/60">× {num(l.qty, lang)}</span>
                    </span>
                    <span className="tabular-nums">{fmt(l.qty * shop.boxPrice)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center justify-between border-t border-berry/10 pt-4 text-lg font-semibold text-plum">
                <span>{c.total}</span>
                <span className="font-display text-2xl">{fmt(total)}</span>
              </p>
            </section>

            <fieldset>
              <legend className="mb-3 font-semibold text-plum">{c.method}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={`relative ${onlineReady ? "" : "cursor-not-allowed"}`}>
                  <input type="radio" name="method" value="online" disabled={!onlineReady} checked={method === "online"} onChange={() => setMethod("online")} className="peer sr-only" />
                  <span className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-berry/15 bg-ivory px-4 py-3 transition-colors duration-200 peer-checked:border-berry peer-checked:bg-pink-soft/60 peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-deep">
                    <CardIcon className="h-6 w-6 shrink-0 text-berry" />
                    <span className="flex-1">
                      <span className="block font-semibold text-plum">{c.card}</span>
                      <span className="block text-xs text-berry-deep/70">{onlineReady ? c.cardOnline : c.cardOffline}</span>
                    </span>
                    {!onlineReady && <span className="rounded-full bg-berry/10 px-2 py-0.5 text-[0.7rem] font-semibold text-berry">{c.soon}</span>}
                  </span>
                </label>

                <label className="relative">
                  <input type="radio" name="method" value="bit" checked={method === "bit"} onChange={() => setMethod("bit")} className="peer sr-only" />
                  <span className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-berry/15 bg-ivory px-4 py-3 transition-colors duration-200 peer-checked:border-berry peer-checked:bg-pink-soft/60 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-deep">
                    <Mobile className="h-6 w-6 shrink-0 text-berry" />
                    <span>
                      <span className="block font-semibold text-plum" dir="ltr">
                        Bit
                      </span>
                      <span className="block text-xs text-berry-deep/70">{c.bitSub}</span>
                    </span>
                  </span>
                </label>
              </div>

              {method === "bit" && (
                <div className="mt-4 rounded-2xl border border-dashed border-berry/30 bg-ivory p-5">
                  <ol className="space-y-4 text-plum">
                    <li className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-berry text-sm text-ivory">{num(1, lang)}</span>
                      <span className="flex-1">
                        {c.bit1a}{" "}
                        <span dir="ltr" className="font-semibold">
                          Bit
                        </span>{" "}
                        {c.bit1b}
                        <span className="mx-1 inline-flex flex-wrap items-center gap-2">
                          <span className="font-display text-xl text-berry">{fmt(total)}</span>
                          <CopyButton value={String(total)} label={c.copyAmount} />
                        </span>
                        {c.bit1c}
                        <span className="mx-1 inline-flex flex-wrap items-center gap-2">
                          <span className="font-semibold tabular-nums" dir="ltr">
                            {payments.bit.display}
                          </span>
                          <CopyButton value={payments.bit.phone} label={c.copyBit} />
                        </span>
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-berry text-sm text-ivory">{num(2, lang)}</span>
                      <span className="flex-1">{c.bit2}</span>
                    </li>
                  </ol>
                </div>
              )}

              {method === "online" && <p className="mt-4 rounded-2xl bg-ivory p-4 text-sm leading-7 text-berry-deep/80">{c.onlineNote}</p>}
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="mb-1 font-semibold text-plum">{c.delivery}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="co-name" className="text-sm text-berry-deep">
                    {c.name}
                  </label>
                  <input id="co-name" name="name" autoComplete="name" className={`${field} ${border("name")}`} aria-invalid={!!errors.name} aria-describedby={errors.name ? "co-name-err" : undefined} />
                  {errors.name && <p id="co-name-err" className="mt-1.5 text-sm text-berry">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="co-phone" className="text-sm text-berry-deep">
                    {c.phone}
                  </label>
                  <input id="co-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={`${field} ${border("phone")} rtl:text-right`} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "co-phone-err" : undefined} />
                  {errors.phone && <p id="co-phone-err" className="mt-1.5 text-sm text-berry">{errors.phone}</p>}
                </div>
              </div>
              {method === "online" && (
                <div>
                  <label htmlFor="co-email" className="text-sm text-berry-deep">
                    {c.email} <span className="text-berry-deep/60">{c.emailHint}</span>
                  </label>
                  <input id="co-email" name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" className={`${field} ${border("email")} rtl:text-right`} aria-invalid={!!errors.email} aria-describedby={errors.email ? "co-email-err" : undefined} />
                  {errors.email && <p id="co-email-err" className="mt-1.5 text-sm text-berry">{errors.email}</p>}
                </div>
              )}
              <div>
                <label htmlFor="co-address" className="text-sm text-berry-deep">
                  {c.address}
                </label>
                <input id="co-address" name="address" autoComplete="street-address" className={`${field} ${border("address")}`} aria-invalid={!!errors.address} aria-describedby={errors.address ? "co-address-err" : undefined} />
                {errors.address && <p id="co-address-err" className="mt-1.5 text-sm text-berry">{errors.address}</p>}
              </div>
              <div>
                <label htmlFor="co-notes" className="text-sm text-berry-deep">
                  {c.notes} <span className="text-berry-deep/60">{c.optional}</span>
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
                  {pending ? c.opening : t(c.payNow, { total: fmt(total) })}
                </>
              ) : (
                <>
                  <WhatsApp className="h-5 w-5" />
                  {t(c.send, { total: fmt(total) })}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
