import type { Locale } from "./i18n/config";

/** Only allow redirects back into this site (no open redirects). */
export function safeNext(next: unknown, lang: Locale): string {
  const value = typeof next === "string" ? next : "";
  if (value.startsWith(`/${lang}/`) || value === `/${lang}` || value === "/admin" || value.startsWith("/admin/")) {
    if (!value.startsWith("//") && !value.includes("\\")) return value;
  }
  return `/${lang}/account`;
}
