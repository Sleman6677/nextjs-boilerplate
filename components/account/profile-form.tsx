"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveProfile } from "@/app/actions/account";
import type { Profile } from "@/lib/account";
import { localeNames, locales } from "@/lib/i18n/config";
import { useI18n } from "../i18n-provider";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { dict } = useI18n();
  const f = dict.account.profile;
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setSaved(false);
    await saveProfile({ fullName: String(d.get("fullName") ?? ""), phone: String(d.get("phone") ?? ""), lang: String(d.get("lang") ?? "ar") });
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const field =
    "mt-1.5 block w-full rounded-2xl border border-cocoa/15 bg-ivory px-4 py-3 text-base text-cocoa focus:border-gold-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5 rounded-[2rem] border border-cocoa/10 bg-ivory p-6 sm:p-8">
      <div>
        <label htmlFor="pf-name" className="text-sm text-cocoa">{f.name}</label>
        <input id="pf-name" name="fullName" autoComplete="name" defaultValue={profile.fullName} className={field} />
      </div>
      <div>
        <label htmlFor="pf-phone" className="text-sm text-cocoa">{f.phone}</label>
        <input id="pf-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" defaultValue={profile.phone} className={`${field} rtl:text-right`} />
      </div>
      <div>
        <label htmlFor="pf-email" className="text-sm text-cocoa">{f.email}</label>
        <input id="pf-email" value={profile.email} readOnly dir="ltr" className={`${field} bg-sand/40 text-taupe rtl:text-right`} />
      </div>
      <div>
        <label htmlFor="pf-lang" className="text-sm text-cocoa">{f.lang}</label>
        <select id="pf-lang" name="lang" defaultValue={profile.lang} className={field}>
          {locales.map((l) => (
            <option key={l} value={l}>{localeNames[l]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className="btn btn-ink disabled:opacity-70">{f.save}</button>
        {saved ? <span role="status" className="text-sm text-gold-deep">{f.saved}</span> : null}
      </div>
    </form>
  );
}
