"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveProfile } from "@/app/actions/account";
import type { Profile } from "@/lib/account";
import { localeNames, locales } from "@/lib/i18n/config";
import { displayPhone } from "@/lib/phone";
import { useI18n } from "../i18n-provider";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { dict } = useI18n();
  const f = dict.account.profile;
  const sa = dict.store.account;
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setSaved(false);
    setError(null);
    const r = await saveProfile({
      fullName: String(d.get("fullName") ?? ""),
      email: String(d.get("email") ?? ""),
      birthday: String(d.get("birthday") ?? ""),
      lang: String(d.get("lang") ?? "ar"),
      marketingConsent: d.get("consent") === "on",
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error === "email_taken" ? sa.emailTaken : r.error === "birthday" ? sa.birthdayInvalid : r.error === "email" ? dict.store.checkout.errors.invalid_email : dict.store.checkout.errors.generic);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const field = "mt-1.5 block w-full rounded-2xl border border-cocoa/15 bg-ivory px-4 py-3 text-base text-cocoa focus:border-gold-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5 rounded-[2rem] border border-cocoa/10 bg-ivory p-6 sm:p-8">
      <div>
        <label htmlFor="pf-name" className="text-sm text-cocoa">
          {f.name}
        </label>
        <input id="pf-name" name="fullName" autoComplete="name" defaultValue={profile.fullName} className={field} />
      </div>
      <div>
        <label htmlFor="pf-phone" className="text-sm text-cocoa">
          {sa.phone}
        </label>
        <input id="pf-phone" value={displayPhone(profile.phone)} readOnly dir="ltr" aria-describedby="pf-phone-hint" className={`${field} bg-sand/40 text-taupe rtl:text-right`} />
        <p id="pf-phone-hint" className="mt-1 text-xs text-taupe">
          {sa.phoneFixed}
        </p>
      </div>
      <div>
        <label htmlFor="pf-email" className="text-sm text-cocoa">
          {f.email}
        </label>
        <input id="pf-email" name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" defaultValue={profile.email} className={`${field} rtl:text-right`} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-birthday" className="text-sm text-cocoa">
            {sa.birthday}
          </label>
          <input id="pf-birthday" name="birthday" type="date" min="1920-01-01" defaultValue={profile.birthday ?? ""} aria-describedby="pf-birthday-hint" className={field} />
          <p id="pf-birthday-hint" className="mt-1 text-xs text-taupe">
            {sa.birthdayHint}
          </p>
        </div>
        <div>
          <label htmlFor="pf-lang" className="text-sm text-cocoa">
            {f.lang}
          </label>
          <select id="pf-lang" name="lang" defaultValue={profile.lang} className={field}>
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex min-h-11 items-start gap-3 text-sm text-cocoa">
        <input type="checkbox" name="consent" defaultChecked={profile.marketingConsent} className="mt-0.5 h-5 w-5 shrink-0 accent-[#7d5e27]" />
        {sa.consent}
      </label>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={busy} className="btn btn-ink disabled:opacity-70">
          {f.save}
        </button>
        {saved ? (
          <span role="status" className="text-sm text-gold-deep">
            {f.saved}
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-sm text-rosewood">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
