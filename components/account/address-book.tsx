"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/app/actions/account";
import type { Address } from "@/lib/account";
import { useI18n } from "../i18n-provider";

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const { dict } = useI18n();
  const a = dict.account.addresses;
  const p = dict.pay;
  const router = useRouter();
  const [editing, setEditing] = useState<Address | "new" | null>(addresses.length ? null : "new");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await saveAddress({
      id: editing && editing !== "new" ? editing.id : undefined,
      label: String(d.get("label") ?? ""),
      recipient: String(d.get("recipient") ?? ""),
      phone: String(d.get("phone") ?? ""),
      city: String(d.get("city") ?? ""),
      street: String(d.get("street") ?? ""),
      notes: String(d.get("notes") ?? ""),
      isDefault: d.get("isDefault") === "on",
    });
    setBusy(false);
    if (!res.ok) return setError(dict.account.errRequired);
    setEditing(null);
    router.refresh();
  }

  const field =
    "mt-1.5 block w-full rounded-2xl border border-cocoa/15 bg-surface px-4 py-3 text-base text-cocoa focus:border-gold-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";
  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-6">
      {addresses.length === 0 && !editing ? <p className="text-taupe">{a.empty}</p> : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((ad) => (
          <li key={ad.id} className="rounded-[1.75rem] border border-cocoa/10 bg-surface p-6">
            <p className="font-semibold text-cocoa">
              {ad.label || ad.recipient}
              {ad.isDefault ? <span className="ms-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold-deep">{a.isDefault}</span> : null}
            </p>
            <p className="mt-2 leading-7 text-taupe">
              {ad.recipient} · <span dir="ltr">{ad.phone}</span>
              <br />
              {ad.street}, {ad.city}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button type="button" onClick={() => setEditing(ad)} className="min-h-11 rounded-full border border-cocoa/15 px-4 text-cocoa hover:border-cocoa">
                {a.edit}
              </button>
              {!ad.isDefault ? (
                <button type="button" onClick={async () => { await setDefaultAddress(ad.id); router.refresh(); }} className="min-h-11 rounded-full border border-cocoa/15 px-4 text-cocoa hover:border-cocoa">
                  {a.makeDefault}
                </button>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(a.confirm)) return;
                  await deleteAddress(ad.id);
                  router.refresh();
                }}
                className="min-h-11 rounded-full px-4 text-rosewood hover:bg-rosewood/10"
              >
                {a.remove}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing ? (
        <form key={current?.id ?? "new"} onSubmit={onSubmit} noValidate className="grid gap-4 rounded-none border border-cocoa/10 bg-surface p-6 sm:grid-cols-2 sm:p-8">
          <div className="sm:col-span-2">
            <label htmlFor="ad-label" className="text-sm text-cocoa">{a.label}</label>
            <input id="ad-label" name="label" defaultValue={current?.label} className={field} />
          </div>
          <div>
            <label htmlFor="ad-recipient" className="text-sm text-cocoa">{p.recipient}</label>
            <input id="ad-recipient" name="recipient" autoComplete="name" defaultValue={current?.recipient} required className={field} />
          </div>
          <div>
            <label htmlFor="ad-phone" className="text-sm text-cocoa">{p.phone}</label>
            <input id="ad-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" defaultValue={current?.phone} required className={`${field} rtl:text-right`} />
          </div>
          <div>
            <label htmlFor="ad-city" className="text-sm text-cocoa">{p.city}</label>
            <input id="ad-city" name="city" autoComplete="address-level2" defaultValue={current?.city} required className={field} />
          </div>
          <div>
            <label htmlFor="ad-street" className="text-sm text-cocoa">{p.street}</label>
            <input id="ad-street" name="street" autoComplete="street-address" defaultValue={current?.street} required className={field} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ad-notes" className="text-sm text-cocoa">{p.notes} <span className="text-taupe">{p.optional}</span></label>
            <input id="ad-notes" name="notes" defaultValue={current?.notes} className={field} />
          </div>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input type="checkbox" name="isDefault" defaultChecked={current?.isDefault} className="h-5 w-5 accent-[#7d5e27]" />
            <span className="text-cocoa">{a.makeDefault}</span>
          </label>
          {error ? <p role="alert" className="text-sm text-rosewood sm:col-span-2">{error}</p> : null}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className="btn btn-ink disabled:opacity-70">{a.save}</button>
            {addresses.length ? (
              <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost-dark">{a.cancel}</button>
            ) : null}
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="btn btn-ink">
          + {a.add}
        </button>
      )}
    </div>
  );
}
