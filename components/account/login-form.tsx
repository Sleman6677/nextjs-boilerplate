"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { sendCode, verifyCode, type LoginTarget } from "@/app/actions/auth";
import { t } from "@/lib/i18n/format";
import { useI18n } from "../i18n-provider";

/** Sign in with a code: by SMS for customers, by email for staff. */
export function LoginForm({ next }: { next: string }) {
  const { lang, dict } = useI18n();
  const a = dict.auth;
  const l = dict.store.login;
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"target" | "code">("target");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = (): LoginTarget => (mode === "phone" ? { phone: value } : { email: value });
  const errorText = (code?: string) => (code && code in l.errors ? l.errors[code as keyof typeof l.errors] : l.errors.send);

  async function onTarget(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await sendCode(target());
    setBusy(false);
    if (res.ok) setStep("code");
    else setError(errorText(res.error));
  }

  async function onCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "");
    setBusy(true);
    setError(null);
    const res = await verifyCode(target(), code, lang);
    if (res.ok) {
      // /admin is a separate root layout, so leave with a full page load.
      if (next.startsWith("/admin")) window.location.assign(next);
      else {
        router.replace(next);
        router.refresh();
      }
      return;
    }
    setBusy(false);
    setError(errorText(res.error));
  }

  const field =
    "mt-2 block w-full rounded-2xl border border-cocoa/15 bg-surface px-4 py-3.5 text-base text-cocoa transition-colors duration-200 focus:border-gold-deep focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";

  return (
    <div className="rounded-none border border-cocoa/10 bg-surface/80 p-6 shadow-[0_30px_80px_-50px_rgba(43,33,28,0.5)] sm:p-10">
      {step === "target" ? (
        <form onSubmit={onTarget} noValidate>
          <p className="text-sm text-taupe">{l.text}</p>
          <label htmlFor="login-target" className="mt-5 block text-sm font-semibold text-cocoa">
            {mode === "phone" ? l.phone : l.email}
          </label>
          <input
            key={mode}
            id="login-target"
            type={mode === "phone" ? "tel" : "email"}
            inputMode={mode === "phone" ? "tel" : "email"}
            autoComplete={mode === "phone" ? "tel" : "email"}
            placeholder={mode === "phone" ? "05X-XXX-XXXX" : "name@example.com"}
            dir="ltr"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${field} rtl:text-right`}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />
          {error ? (
            <p id="login-error" role="alert" className="mt-3 text-sm text-rosewood">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy} className="btn btn-gold mt-6 w-full disabled:opacity-70">
            {busy ? a.sending : l.send}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "phone" ? "email" : "phone");
              setValue("");
              setError(null);
            }}
            className="link-line mt-5 min-h-11 text-sm text-taupe"
          >
            {mode === "phone" ? l.staff : l.customer}
          </button>
        </form>
      ) : (
        <form onSubmit={onCode} noValidate>
          <p className="text-cocoa" role="status">
            {t(l.sentTo, { phone: value })}
          </p>
          <label htmlFor="login-code" className="mt-6 block text-sm font-semibold text-cocoa">
            {l.code}
          </label>
          <input id="login-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} dir="ltr" autoFocus className={`${field} text-center text-2xl tracking-[0.5em]`} aria-invalid={!!error} aria-describedby={error ? "code-error" : undefined} />
          {error ? (
            <p id="code-error" role="alert" className="mt-3 text-sm text-rosewood">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={busy} className="btn btn-gold mt-6 w-full disabled:opacity-70">
            {busy ? a.verifying : l.verify}
          </button>
          <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("target");
                setError(null);
              }}
              className="link-line min-h-11 text-cocoa"
            >
              {l.change}
            </button>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                const r = await sendCode(target());
                if (!r.ok) setError(errorText(r.error));
              }}
              className="link-line min-h-11 text-cocoa"
            >
              {l.resend}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
