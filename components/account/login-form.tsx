"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { sendCode, verifyCode } from "@/app/actions/auth";
import { t } from "@/lib/i18n/format";
import { useI18n } from "../i18n-provider";

export function LoginForm({ next }: { next: string }) {
  const { lang, dict } = useI18n();
  const a = dict.auth;
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await sendCode(email);
    setBusy(false);
    if (res.ok) setStep("code");
    else setError(res.error === "email" ? a.errEmail : res.error === "unavailable" ? a.unavailable : a.errSend);
  }

  async function onCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setBusy(true);
    setError(null);
    const res = await verifyCode(email, code, lang);
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setBusy(false);
    setError(res.error === "unavailable" ? a.unavailable : a.errCode);
  }

  const field =
    "mt-2 block w-full rounded-2xl border border-cocoa/15 bg-ivory px-4 py-3.5 text-base text-cocoa transition-colors duration-200 focus:border-gold-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";

  return (
    <div className="rounded-[2rem] border border-cocoa/10 bg-ivory/80 p-6 shadow-[0_30px_80px_-50px_rgba(43,33,28,0.5)] sm:p-10">
      {step === "email" ? (
        <form onSubmit={onEmail} noValidate>
          <label htmlFor="login-email" className="text-sm font-semibold text-cocoa">
            {a.email}
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${field} rtl:text-right`}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />
          {error ? <p id="login-error" role="alert" className="mt-3 text-sm text-rosewood">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn btn-gold mt-6 w-full disabled:opacity-70">
            {busy ? a.sending : a.send}
          </button>
        </form>
      ) : (
        <form onSubmit={onCode} noValidate>
          <p className="text-cocoa" role="status">
            {t(a.sent, { email })}
          </p>
          <p className="mt-1 text-sm text-taupe">{a.inbox}</p>
          <label htmlFor="login-code" className="mt-6 block text-sm font-semibold text-cocoa">
            {a.code}
          </label>
          <input
            id="login-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            dir="ltr"
            autoFocus
            className={`${field} text-center text-2xl tracking-[0.5em]`}
            aria-invalid={!!error}
            aria-describedby={error ? "code-error" : undefined}
          />
          {error ? <p id="code-error" role="alert" className="mt-3 text-sm text-rosewood">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn btn-gold mt-6 w-full disabled:opacity-70">
            {busy ? a.verifying : a.verify}
          </button>
          <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
            <button type="button" onClick={() => { setStep("email"); setError(null); }} className="link-line min-h-11 text-cocoa">
              {a.change}
            </button>
            <button type="button" onClick={async () => { setError(null); const r = await sendCode(email); if (!r.ok) setError(a.errSend); }} className="link-line min-h-11 text-cocoa">
              {a.resend}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
