"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { checkout } from "@/app/actions/shop";
import type { Address } from "@/lib/account";
import type { Product } from "@/lib/catalog";
import { href } from "@/lib/i18n/config";
import { localized, money, num, points as pointsLabel, t } from "@/lib/i18n/format";
import type { Zone } from "@/lib/orders";
import { normalizePhone } from "@/lib/phone";
import { trackBeginCheckout, trackPurchase } from "@/lib/track";
import { cart, cartExtras, lineKey, useCart, useCartExtras } from "../cart-store";
import { useI18n } from "../i18n-provider";
import { CardIcon, Mobile, Sparkle } from "../icons";
import { CodeField } from "./cart-view";
import { OrderSummary } from "./order-summary";
import { useQuote } from "./use-quote";

type Method = "card" | "apple_pay" | "bit" | "cash";

export type CheckoutProfile = { fullName: string; phone: string; email: string; birthday: string | null; marketingConsent: boolean } | null;

export function CheckoutForm({
  products,
  zones,
  addresses,
  profile,
  methods,
  bitPhone,
}: {
  products: Product[];
  zones: Zone[];
  addresses: Address[];
  profile: CheckoutProfile;
  methods: { card: boolean; apple_pay: boolean; bitOnline: boolean };
  bitPhone: string;
}) {
  const { lang, dict } = useI18n();
  const ck = dict.store.checkout;
  const c = dict.store.cart;
  const router = useRouter();
  const items = useCart();
  const extras = useCartExtras();
  const byId = new Map(products.map((x) => [x.id, x]));
  const lines = items.filter((i) => byId.has(i.id));
  const fmt = (n: number) => money(n, lang);

  const [name, setName] = useState(profile?.fullName ?? "");
  const [phone, setPhone] = useState(profile?.phone ? `0${profile.phone.slice(4)}` : "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState<string>(defaultAddress?.id ?? "new");
  const [saveNew, setSaveNew] = useState(true);
  const [method, setMethod] = useState<Method>(methods.card ? "card" : "cash");
  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const phoneNorm = normalizePhone(phone);
  const { quote, error: quoteError, busy } = useQuote(
    { cart: lines.map((l) => ({ id: l.id, variantId: l.variantId, qty: l.qty })), couponCode: extras.couponCode, giftCardCode: extras.giftCardCode, usePoints: extras.usePoints, zoneId: extras.zoneId || null, phone: phoneNorm ?? undefined },
    lines.length > 0,
  );
  const tracked = useRef(false);
  const trackItems = () =>
    (quote?.items ?? []).map((it) => {
      const pl = quote?.lines.find((l) => l.key === it.key);
      return { id: it.productId, name: it.name.en || it.name.ar, price: pl ? pl.lineTotal / pl.qty : 0, quantity: pl?.qty ?? 1, variant: it.variantName?.en || it.variantName?.ar };
    });
  useEffect(() => {
    if (!quote || tracked.current) return;
    tracked.current = true;
    trackBeginCheckout(trackItems(), quote.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the first quote arrives
  }, [quote]);
  const zone = zones.find((z) => z.id === extras.zoneId) ?? null;
  const needsShipping = quote ? quote.needsShipping : lines.some((l) => byId.get(l.id)?.kind !== "gift_card");
  const paidInFull = quote !== null && quote.total === 0;
  const useNew = addressId === "new" || !profile || addresses.length === 0;

  if (lines.length === 0) {
    return (
      <div className="rounded-[2rem] border border-berry/10 bg-ivory p-10 text-center">
        <p className="text-lg text-plum">{c.empty}</p>
        <Link href={href(lang, "/shop")} className="btn btn-berry mt-6">
          {c.continue}
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = ck.errors.invalid_name;
    if (!phoneNorm || !/^\+9725/.test(phoneNorm)) next.phone = ck.errors.invalid_phone;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = ck.errors.invalid_email;
    if (needsShipping && !zone) next.zone = ck.errors.invalid_zone;
    if (needsShipping && zone && !zone.isPickup && useNew && (String(d.get("city") ?? "").trim().length < 2 || String(d.get("street") ?? "").trim().length < 2)) next.address = ck.errors.invalid_shipping;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) {
      document.getElementById(`ck-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setPlacing(true);
    const res = await checkout({
      cart: lines.map((l) => ({ id: l.id, variantId: l.variantId, qty: l.qty })),
      couponCode: extras.couponCode || undefined,
      giftCardCode: extras.giftCardCode || undefined,
      usePoints: extras.usePoints,
      method: paidInFull ? "cash" : method,
      zoneId: needsShipping ? extras.zoneId : null,
      contact: { name: name.trim(), phone, email: email.trim() || undefined },
      addressId: !useNew ? addressId : undefined,
      address: useNew ? { city: String(d.get("city") ?? ""), street: String(d.get("street") ?? ""), notes: String(d.get("notes") ?? "") } : undefined,
      saveAddress: saveNew,
      note: extras.note || undefined,
      birthday: String(d.get("birthday") ?? "") || undefined,
      marketingConsent: d.get("consent") === "on",
      lang,
    });
    if (!res.ok) {
      setPlacing(false);
      const msg = (ck.errors as Record<string, string>)[res.error] ?? (ck.couponErrors as Record<string, string>)[res.error] ?? (ck.giftErrors as Record<string, string>)[res.error] ?? ck.errors.generic;
      setFormError(t(msg, { name: res.detail ?? "" }));
      return;
    }
    if (quote && !res.payUrl) trackPurchase(res.number, trackItems(), quote.total);
    cart.clear();
    if (res.payUrl) window.location.assign(res.payUrl);
    else router.push(`${res.orderPath}&new=1${res.paymentError ? "&payerror=1" : ""}`);
  }

  const field = "mt-1.5 block w-full rounded-2xl border border-berry/15 bg-ivory px-4 py-3 text-base text-plum transition-colors duration-200 focus:border-berry focus:outline-none focus-visible:outline-2 focus-visible:outline-pink-deep aria-invalid:border-rose-ink";
  const radioCard = "flex min-h-16 items-center gap-3 rounded-2xl border-2 border-berry/15 bg-ivory px-4 py-3 transition-colors duration-200 peer-checked:border-berry peer-checked:bg-pink-soft/60 peer-disabled:opacity-55 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-deep";
  const err = (id: string) =>
    errors[id] ? (
      <p id={`ck-${id}-err`} role="alert" className="mt-1.5 text-sm text-rose-ink">
        {errors[id]}
      </p>
    ) : null;
  const methodList: { id: Method; label: string; sub: string; enabled: boolean; icon: ReactNode }[] = [
    { id: "card", label: dict.order.methods.card, sub: methods.card ? ck.methodSub.card : ck.soon, enabled: methods.card, icon: <CardIcon className="h-6 w-6 text-berry" /> },
    { id: "apple_pay", label: dict.order.methods.apple_pay, sub: methods.apple_pay ? ck.methodSub.apple_pay : ck.soon, enabled: methods.apple_pay, icon: <span className="font-display text-lg text-berry" aria-hidden="true">Pay</span> },
    { id: "bit", label: dict.order.methods.bit, sub: methods.bitOnline ? ck.methodSub.bit : t(ck.bitManual, { phone: bitPhone }), enabled: true, icon: <Mobile className="h-6 w-6 text-berry" /> },
    { id: "cash", label: dict.order.methods.cash, sub: ck.methodSub.cash, enabled: needsShipping, icon: <span className="font-display text-xl text-berry" aria-hidden="true">₪</span> },
  ];

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-8">
        {!profile ? (
          <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-pink-soft/60 px-5 py-4 text-sm text-plum">
            <Sparkle className="h-3 w-3 text-berry" /> {ck.login}{" "}
            <Link href={href(lang, `/login?next=/${lang}/checkout`)} className="font-semibold text-berry underline underline-offset-4">
              {ck.loginLink}
            </Link>
          </p>
        ) : null}

        <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
          <legend className="font-naskh px-2 text-2xl text-plum">{ck.contact}</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ck-name" className="text-sm text-berry-deep">
                {ck.name}
              </label>
              <input id="ck-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? "ck-name-err" : undefined} className={field} />
              {err("name")}
            </div>
            <div>
              <label htmlFor="ck-phone" className="text-sm text-berry-deep">
                {ck.phone}
              </label>
              <input id="ck-phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} readOnly={Boolean(profile?.phone)} placeholder="05X-XXX-XXXX" required aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "ck-phone-err" : "ck-phone-hint"} className={`${field} rtl:text-right ${profile?.phone ? "bg-pink-soft/30" : ""}`} />
              <p id="ck-phone-hint" className="mt-1.5 text-xs text-berry-deep/70">
                {ck.phoneHint}
              </p>
              {err("phone")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ck-email" className="text-sm text-berry-deep">
                {ck.email} <span className="text-berry-deep/60">({ck.emailHint})</span>
              </label>
              <input id="ck-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "ck-email-err" : undefined} className={`${field} rtl:text-right`} />
              {err("email")}
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
          <legend className="font-naskh px-2 text-2xl text-plum">{ck.delivery}</legend>
          {!needsShipping ? (
            <p className="mt-2 text-plum">{ck.giftOnly}</p>
          ) : (
            <div className="mt-2 space-y-5">
              <div>
                <label htmlFor="ck-zone" className="text-sm text-berry-deep">
                  {c.zone}
                </label>
                <select id="ck-zone" value={extras.zoneId} onChange={(e) => cartExtras.set({ zoneId: e.target.value })} aria-invalid={!!errors.zone} aria-describedby={errors.zone ? "ck-zone-err" : undefined} className={field}>
                  <option value="">{c.zoneChoose}</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {localized(z.name, lang)} · {z.price === 0 ? c.free : fmt(z.price)}
                    </option>
                  ))}
                </select>
                {err("zone")}
              </div>

              {zone?.isPickup ? (
                <p className="rounded-2xl bg-pink-soft/50 px-4 py-3 text-sm text-plum">{ck.pickup}</p>
              ) : zone ? (
                <>
                  {profile && addresses.length > 0 ? (
                    <div className="grid gap-3" role="radiogroup" aria-label={ck.saved}>
                      {addresses.map((a) => (
                        <label key={a.id} className="relative">
                          <input type="radio" name="address" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="peer sr-only" />
                          <span className={radioCard}>
                            <span className="flex-1">
                              <span className="block font-semibold text-plum">{a.label || a.recipient}</span>
                              <span className="block text-sm text-berry-deep/75">
                                {a.street}, {a.city}
                              </span>
                            </span>
                          </span>
                        </label>
                      ))}
                      <label className="relative">
                        <input type="radio" name="address" value="new" checked={addressId === "new"} onChange={() => setAddressId("new")} className="peer sr-only" />
                        <span className={radioCard}>
                          <span className="font-semibold text-plum">+ {ck.newAddress}</span>
                        </span>
                      </label>
                    </div>
                  ) : null}
                  {useNew ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="ck-address" className="text-sm text-berry-deep">
                          {ck.city}
                        </label>
                        <input id="ck-address" name="city" autoComplete="address-level2" required aria-invalid={!!errors.address} aria-describedby={errors.address ? "ck-address-err" : undefined} className={field} />
                      </div>
                      <div>
                        <label htmlFor="ck-street" className="text-sm text-berry-deep">
                          {ck.street}
                        </label>
                        <input id="ck-street" name="street" autoComplete="street-address" required aria-invalid={!!errors.address} className={field} />
                      </div>
                      <div className="sm:col-span-2">
                        {err("address")}
                        <label htmlFor="ck-notes" className="text-sm text-berry-deep">
                          {ck.notes} <span className="text-berry-deep/60">{dict.pay.optional}</span>
                        </label>
                        <input id="ck-notes" name="notes" className={field} />
                      </div>
                      {profile ? (
                        <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
                          <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="h-5 w-5 accent-[#8a2c52]" />
                          <span className="text-plum">{ck.saveAddress}</span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          )}
        </fieldset>

        <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
          <legend className="font-naskh px-2 text-2xl text-plum">{c.coupon}</legend>
          {quote?.discountKind === "first_order" ? (
            <p className="mb-4 flex items-center gap-2 rounded-2xl bg-pink-soft/60 px-4 py-3 text-sm text-plum">
              <Sparkle className="h-3 w-3 text-berry" /> {t(dict.pay.firstOrder, { pct: num(quote.discountPct ?? 0, lang) })}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <CodeField
              id="ck-coupon"
              label={c.coupon}
              placeholder={c.couponPh}
              value={extras.couponCode}
              onApply={(v) => cartExtras.set({ couponCode: v })}
              ok={quote?.discountKind === "coupon" ? t(c.couponOk, { code: quote.discountCode ?? "" }) : null}
              error={extras.couponCode && quote?.couponError ? ((ck.couponErrors as Record<string, string>)[quote.couponError] ?? ck.couponErrors.coupon_not_found) : null}
            />
            <CodeField
              id="ck-gift"
              label={c.giftCard}
              placeholder={c.giftCardPh}
              value={extras.giftCardCode}
              onApply={(v) => cartExtras.set({ giftCardCode: v })}
              ok={quote && extras.giftCardCode && !quote.giftCardError ? t(c.giftOk, { balance: fmt(quote.giftCardBalance) }) : null}
              error={extras.giftCardCode && quote?.giftCardError ? ((ck.giftErrors as Record<string, string>)[quote.giftCardError] ?? ck.giftErrors.gift_not_found) : null}
            />
          </div>
          {profile && quote && quote.pointsBalance > 0 ? (
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-plum">
              <input type="checkbox" checked={extras.usePoints} onChange={(e) => cartExtras.set({ usePoints: e.target.checked })} className="h-5 w-5 accent-berry" />
              {t(c.usePoints, { points: pointsLabel(quote.pointsAvailable, lang), value: fmt(quote.pointsAvailable * quote.pointValue) })}
            </label>
          ) : null}
          <p className="mt-3 text-xs text-berry-deep/70">{c.oneDiscount}</p>
          <div className="mt-5">
            <label htmlFor="ck-note" className="text-sm text-berry-deep">
              {c.note}
            </label>
            <textarea id="ck-note" value={extras.note} onChange={(e) => cartExtras.set({ note: e.target.value.slice(0, 500) })} placeholder={c.notePh} rows={2} className={field} />
          </div>
        </fieldset>

        <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
          <legend className="font-naskh px-2 text-2xl text-plum">{ck.payment}</legend>
          {paidInFull ? (
            <p className="mt-2 text-plum">{ck.paidInFull}</p>
          ) : (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {methodList.map((m) => (
                <label key={m.id} className={`relative ${m.enabled ? "" : "cursor-not-allowed"}`}>
                  <input type="radio" name="method" value={m.id} disabled={!m.enabled} checked={method === m.id} onChange={() => setMethod(m.id)} className="peer sr-only" />
                  <span className={radioCard}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink-soft">{m.icon}</span>
                    <span>
                      <span className="block font-semibold text-plum">{m.label}</span>
                      <span className="block text-xs text-berry-deep/75">{m.sub}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        {!profile?.birthday || !profile?.marketingConsent ? (
          <fieldset className="rounded-[2rem] border border-berry/10 bg-ivory/70 p-6 sm:p-8">
            <legend className="sr-only">{ck.birthday}</legend>
            {!profile?.birthday ? (
              <div className="max-w-xs">
                <label htmlFor="ck-birthday" className="text-sm text-berry-deep">
                  {ck.birthday} <span className="text-berry-deep/60">({ck.birthdayHint})</span>
                </label>
                <input id="ck-birthday" name="birthday" type="date" min="1920-01-01" className={field} />
              </div>
            ) : null}
            {!profile?.marketingConsent ? (
              <label className="mt-4 flex min-h-11 items-start gap-3 text-sm text-plum">
                <input type="checkbox" name="consent" className="mt-0.5 h-5 w-5 shrink-0 accent-[#8a2c52]" />
                {ck.consent}
              </label>
            ) : null}
          </fieldset>
        ) : null}
      </div>

      <aside className="h-fit rounded-[2rem] bg-plum p-6 text-ivory lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">{dict.pay.summary}</h2>
        <ul className="mt-4 space-y-2 border-b border-pink-soft/15 pb-4 text-sm">
          {(quote?.items ?? []).map((it) => {
            const qty = lines.find((l) => lineKey(l) === it.key)?.qty ?? 0;
            return (
              <li key={it.key} className="text-pink-soft/90">
                {localized(it.name, lang)}
                {it.variantName ? ` · ${localized(it.variantName, lang)}` : ""} <span className="text-pink-soft/60">× {num(qty, lang)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <OrderSummary quote={quote} busy={busy} />
        </div>
        {quoteError ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-ink/30 px-3 py-2 text-sm">
            {t((ck.errors as Record<string, string>)[quoteError.code] ?? ck.errors.generic, { name: quoteError.detail ?? "" })}
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-ink/30 px-3 py-2 text-sm">
            {formError}
          </p>
        ) : null}
        <button type="submit" disabled={placing || !quote || !!quoteError} className="btn btn-pink mt-6 w-full disabled:opacity-60">
          {placing ? ck.placing : t(ck.place, { total: quote ? fmt(quote.total) : "" })}
        </button>
        <p className="mt-3 text-center text-xs text-pink-soft/70">{ck.secure}</p>
      </aside>
    </form>
  );
}
