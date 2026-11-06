"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { checkout, getQuote } from "@/app/actions/shop";
import type { Address } from "@/lib/account";
import type { Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, num, points as pointsLabel, t } from "@/lib/i18n/format";
import type { QuoteResult } from "@/lib/orders";
import { shop } from "@/lib/site";
import { cart, useCart } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { CardIcon, Mobile, Sparkle } from "../icons";

type Method = "card" | "apple_pay" | "bit" | "cash";

export function CheckoutForm({
  products,
  addresses,
  profile,
  balance,
  pointValue,
  methods,
  bitPhone,
}: {
  products: Product[];
  addresses: Address[];
  profile: { fullName: string; phone: string };
  balance: number;
  pointValue: number;
  methods: { card: boolean; apple_pay: boolean; bitOnline: boolean };
  bitPhone: string;
}) {
  const { lang, dict } = useI18n();
  const p = dict.pay;
  const o = dict.order;
  const router = useRouter();
  const items = useCart();
  const byId = useMemo(() => new Map(products.map((x) => [x.id, x])), [products]);
  const lines = items.filter((i) => byId.has(i.id));
  const cartKey = lines.map((l) => `${l.id}:${l.qty}`).join(",");
  const fmt = (n: number) => money(n, lang, shop.currency);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [saveNew, setSaveNew] = useState(true);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [method, setMethod] = useState<Method>(methods.card ? "card" : "bit");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live server-side price breakdown.
  useEffect(() => {
    if (!cartKey) return;
    let cancelled = false;
    (async () => {
      const res = await getQuote({ cart: lines.map((l) => ({ id: l.id, qty: l.qty })), couponCode: coupon || undefined, usePoints });
      if (cancelled) return;
      if (!res.ok) {
        setError(p.errors[res.error as keyof typeof p.errors] ?? p.errors.generic);
        return;
      }
      if (res.quote.couponError) {
        setCouponError(p.couponErrors[res.quote.couponError as keyof typeof p.couponErrors] ?? p.couponErrors.coupon_not_found);
        setCoupon("");
      }
      setQuote(res.quote);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, coupon, usePoints]);

  if (lines.length === 0) {
    return (
      <div className="rounded-[2rem] border border-berry/10 bg-ivory p-10 text-center">
        <p className="text-lg text-plum">{dict.cart.empty}</p>
        <a href={href(lang, "/shop")} className="btn btn-berry mt-6">
          {dict.cart.continue}
        </a>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (placing) return;
    setError(null);
    const data = new FormData(e.currentTarget);
    const shipping =
      addressId === "new"
        ? {
            name: String(data.get("recipient") ?? ""),
            phone: String(data.get("phone") ?? ""),
            city: String(data.get("city") ?? ""),
            street: String(data.get("street") ?? ""),
            notes: String(data.get("notes") ?? ""),
          }
        : undefined;
    setPlacing(true);
    const res = await checkout({
      cart: lines.map((l) => ({ id: l.id, qty: l.qty })),
      couponCode: coupon || undefined,
      usePoints,
      method,
      addressId: addressId === "new" ? undefined : addressId,
      shipping,
      saveAddress: saveNew,
      lang,
    });
    if (!res.ok) {
      setPlacing(false);
      if (res.error === "auth") router.push(href(lang, `/login?next=/${lang}/checkout`));
      else if (res.error.startsWith("coupon_")) {
        setCouponError(p.couponErrors[res.error as keyof typeof p.couponErrors] ?? p.couponErrors.coupon_not_found);
        setCoupon("");
      } else setError(p.errors[res.error as keyof typeof p.errors] ?? p.errors.generic);
      return;
    }
    cart.clear();
    if (res.payUrl) window.location.assign(res.payUrl);
    else router.push(href(lang, `/account/orders/${res.number}?new=1${res.paymentError ? "&payerror=1" : ""}`));
  }

  const field =
    "mt-1.5 block w-full rounded-2xl border border-berry/15 bg-ivory px-4 py-3 text-base text-plum transition-colors duration-200 focus:border-berry focus:outline-none focus-visible:outline-2 focus-visible:outline-pink-deep";
  const radioCard =
    "flex min-h-16 items-center gap-3 rounded-2xl border-2 border-berry/15 bg-ivory px-4 py-3 transition-colors duration-200 peer-checked:border-berry peer-checked:bg-pink-soft/60 peer-disabled:opacity-55 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-deep";

  const methodList: { id: Method; label: string; sub: string; enabled: boolean; icon: React.ReactNode }[] = [
    { id: "card", label: o.methods.card, sub: methods.card ? p.methodSub.card : p.soon, enabled: methods.card, icon: <CardIcon className="h-6 w-6 text-berry" /> },
    { id: "apple_pay", label: o.methods.apple_pay, sub: methods.apple_pay ? p.methodSub.apple_pay : p.soon, enabled: methods.apple_pay, icon: <span className="font-display text-lg text-berry" aria-hidden="true">Pay</span> },
    { id: "bit", label: o.methods.bit, sub: methods.bitOnline ? p.methodSub.bit : t(p.bitManual, { phone: bitPhone }), enabled: true, icon: <Mobile className="h-6 w-6 text-berry" /> },
    { id: "cash", label: o.methods.cash, sub: p.methodSub.cash, enabled: true, icon: <span className="font-display text-xl text-berry" aria-hidden="true">₪</span> },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-8">
        {/* Address */}
        <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
          <legend className="font-naskh px-2 text-2xl text-plum">{p.address}</legend>
          <div className="mt-2 grid gap-3">
            {addresses.map((a) => (
              <label key={a.id} className="relative">
                <input type="radio" name="address" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="peer sr-only" />
                <span className={radioCard}>
                  <span className="flex-1">
                    <span className="block font-semibold text-plum">
                      {a.label || a.recipient}
                      {a.isDefault ? <span className="ms-2 rounded-full bg-berry/10 px-2 py-0.5 text-xs text-berry">{dict.account.addresses.isDefault}</span> : null}
                    </span>
                    <span className="block text-sm text-berry-deep/75">
                      {a.recipient} · <span dir="ltr">{a.phone}</span> · {a.street}, {a.city}
                    </span>
                  </span>
                </span>
              </label>
            ))}
            <label className="relative">
              <input type="radio" name="address" value="new" checked={addressId === "new"} onChange={() => setAddressId("new")} className="peer sr-only" />
              <span className={radioCard}>
                <span className="font-semibold text-plum">+ {p.newAddress}</span>
              </span>
            </label>
          </div>

          {addressId === "new" ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ck-recipient" className="text-sm text-berry-deep">{p.recipient}</label>
                <input id="ck-recipient" name="recipient" autoComplete="name" defaultValue={profile.fullName} required className={field} />
              </div>
              <div>
                <label htmlFor="ck-phone" className="text-sm text-berry-deep">{p.phone}</label>
                <input id="ck-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" defaultValue={profile.phone} required className={`${field} rtl:text-right`} />
              </div>
              <div>
                <label htmlFor="ck-city" className="text-sm text-berry-deep">{p.city}</label>
                <input id="ck-city" name="city" autoComplete="address-level2" required className={field} />
              </div>
              <div>
                <label htmlFor="ck-street" className="text-sm text-berry-deep">{p.street}</label>
                <input id="ck-street" name="street" autoComplete="street-address" required className={field} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ck-notes" className="text-sm text-berry-deep">
                  {p.notes} <span className="text-berry-deep/60">{p.optional}</span>
                </label>
                <input id="ck-notes" name="notes" className={field} />
              </div>
              <label className="flex items-center gap-3 sm:col-span-2">
                <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="h-5 w-5 accent-[#8a2c52]" />
                <span className="text-plum">{p.saveAddress}</span>
              </label>
            </div>
          ) : null}
        </fieldset>

        {/* Discount & points */}
        <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
          <legend className="font-naskh px-2 text-2xl text-plum">{p.coupon}</legend>
          {quote?.discountKind === "first_order" ? (
            <p className="mb-4 flex items-center gap-2 rounded-2xl bg-pink-soft/60 px-4 py-3 text-sm text-plum">
              <Sparkle className="h-3 w-3 text-berry" /> {t(p.firstOrder, { pct: num(quote.discountPct ?? 0, lang) })}
            </p>
          ) : null}
          {coupon && quote?.discountKind === "coupon" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pink-soft/60 px-4 py-3">
              <span className="text-plum">{t(p.couponOk, { code: coupon.toUpperCase() })}</span>
              <button type="button" onClick={() => { setCoupon(""); setCouponInput(""); }} className="text-sm text-berry underline underline-offset-4">
                {p.removeCoupon}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="ck-coupon" className="sr-only">{p.coupon}</label>
              <input
                id="ck-coupon"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value); setCouponError(null); }}
                placeholder={p.couponPh}
                dir="ltr"
                className={`${field} mt-0 uppercase rtl:text-right`}
                aria-invalid={!!couponError}
                aria-describedby={couponError ? "ck-coupon-err" : "ck-coupon-hint"}
              />
              <button type="button" onClick={() => { setCouponError(null); setCoupon(couponInput.trim()); }} disabled={!couponInput.trim()} className="btn btn-berry shrink-0 px-5 disabled:opacity-50">
                {p.apply}
              </button>
            </div>
          )}
          {couponError ? <p id="ck-coupon-err" role="alert" className="mt-2 text-sm text-berry">{couponError}</p> : null}
          <p id="ck-coupon-hint" className="mt-3 text-xs text-berry-deep/70">{p.oneDiscount}</p>

          <div className="mt-6 border-t border-berry/10 pt-5">
            {balance > 0 ? (
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="h-5 w-5 accent-[#8a2c52]" />
                <span className="text-plum">{t(p.usePoints, { points: pointsLabel(quote?.pointsAvailable ?? balance, lang), value: fmt((quote?.pointsAvailable ?? balance) * pointValue) })}</span>
              </label>
            ) : (
              <p className="text-sm text-berry-deep/75">{p.noPoints}</p>
            )}
          </div>
        </fieldset>

        {/* Payment */}
        <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
          <legend className="font-naskh px-2 text-2xl text-plum">{p.method}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {methodList.map((m) => (
              <label key={m.id} className={`relative ${m.enabled ? "" : "cursor-not-allowed"}`}>
                <input type="radio" name="method" value={m.id} disabled={!m.enabled} checked={method === m.id} onChange={() => setMethod(m.id)} className="peer sr-only" />
                <span className={radioCard}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center">{m.icon}</span>
                  <span>
                    <span className="block font-semibold text-plum" dir={m.id === "bit" || m.id === "apple_pay" ? "ltr" : undefined}>
                      {m.label}
                    </span>
                    <span className="block text-xs text-berry-deep/70">{m.sub}</span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-[2rem] bg-plum p-7 text-ivory lg:sticky lg:top-32">
        <h2 className="font-naskh text-2xl">{p.summary}</h2>
        <ul className="mt-5 space-y-2 border-b border-ivory/15 pb-5 text-sm">
          {lines.map((l) => {
            const prod = byId.get(l.id)!;
            return (
              <li key={l.id} className="flex justify-between gap-3">
                <span>
                  {localized(prod.name, lang)} <span className="text-pink-soft/70">× {num(l.qty, lang)}</span>
                </span>
                <span className="tabular-nums">{fmt(prod.price * l.qty)}</span>
              </li>
            );
          })}
        </ul>
        {quote ? (
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt>{o.subtotal}</dt><dd>{fmt(quote.subtotal)}</dd></div>
            {quote.discountAmount > 0 ? (
              <div className="flex justify-between text-pink-soft">
                <dt>{quote.discountKind === "coupon" ? t(o.discountCoupon, { code: quote.discountCode ?? "" }) : t(o.discountFirst, { pct: num(quote.discountPct ?? 0, lang) })}</dt>
                <dd dir="ltr">−{fmt(quote.discountAmount)}</dd>
              </div>
            ) : null}
            {quote.pointsUsed > 0 ? (
              <div className="flex justify-between text-pink-soft"><dt>{t(o.pointsUsed, { points: num(quote.pointsUsed, lang) })}</dt><dd dir="ltr">−{fmt(quote.pointsValue)}</dd></div>
            ) : null}
            <div className="flex justify-between"><dt>{o.shipping}</dt><dd>{quote.shippingFee === 0 ? o.free : fmt(quote.shippingFee)}</dd></div>
            {quote.freeShippingRemaining ? <p className="text-xs text-pink-soft">{t(dict.cart.freeLeft, { amount: fmt(quote.freeShippingRemaining) })}</p> : null}
            <div className="flex items-baseline justify-between border-t border-ivory/15 pt-3 text-base">
              <dt className="font-semibold">{o.total}</dt>
              <dd className="font-display text-3xl">{fmt(quote.total)}</dd>
            </div>
            {quote.pointsEarned > 0 ? <p className="pt-1 text-xs text-pink-soft">{t(p.earn, { points: pointsLabel(quote.pointsEarned, lang) })}</p> : null}
          </dl>
        ) : (
          <div className="mt-5 h-32 animate-pulse rounded-2xl bg-ivory/10" aria-hidden="true" />
        )}
        {error ? <p role="alert" className="mt-5 rounded-2xl bg-ivory/10 p-3 text-sm text-pink-soft">{error}</p> : null}
        <button type="submit" disabled={placing || !quote} aria-busy={placing} className="btn btn-pink mt-6 w-full disabled:opacity-60">
          {placing ? p.placing : t(p.place, { total: quote ? fmt(quote.total) : "" })}
        </button>
      </aside>
    </form>
  );
}
