import type { Locale } from "./config";

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Locale digits, deterministic on server and client (no Intl differences). */
export function num(value: number | string, lang: Locale): string {
  const s = String(value);
  return lang === "ar" ? s.replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]) : s;
}

/** Price with the shekel sign: "٢٠٠ ₪" (ar), "200 ₪" (he), "₪200" (en). */
export function money(amount: number, lang: Locale, currency = "₪"): string {
  const n = num(Number.isInteger(amount) ? amount : amount.toFixed(2), lang);
  return lang === "en" ? `${currency}${n}` : `${n} ${currency}`;
}

/** Count of boxes with correct plural agreement per language. */
export function boxes(n: number, lang: Locale): string {
  if (lang === "ar") {
    if (n === 1) return "علبة واحدة";
    if (n === 2) return "علبتان";
    if (n >= 3 && n <= 10) return `${num(n, lang)} علب`;
    return `${num(n, lang)} علبة`;
  }
  if (lang === "he") return n === 1 ? "קופסה אחת" : `${n} קופסאות`;
  return n === 1 ? "1 box" : `${n} boxes`;
}

/** Points with plural agreement. */
export function points(n: number, lang: Locale): string {
  if (lang === "ar") {
    if (n === 1) return "نقطة واحدة";
    if (n === 2) return "نقطتان";
    if (n >= 3 && n <= 10) return `${num(n, lang)} نقاط`;
    return `${num(n, lang)} نقطة`;
  }
  if (lang === "he") return n === 1 ? "נקודה אחת" : `${n} נקודות`;
  return n === 1 ? "1 point" : `${n} points`;
}

const dateLocale: Record<Locale, string> = { ar: "ar-EG", he: "he-IL", en: "en-GB" };

/** Server-side date formatting (call only in server components to avoid hydration drift). */
export function date(value: string | Date, lang: Locale): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(dateLocale[lang], { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" }).format(d);
}

/** Fill {placeholders}: t("Hi {name}", { name: "Noor" }) */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
