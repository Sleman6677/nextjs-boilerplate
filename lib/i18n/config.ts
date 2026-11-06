export const locales = ["ar", "he", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export const localeNames: Record<Locale, string> = { ar: "العربية", he: "עברית", en: "English" };
export const localeShort: Record<Locale, string> = { ar: "ع", he: "עב", en: "EN" };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dir(lang: Locale): "rtl" | "ltr" {
  return lang === "en" ? "ltr" : "rtl";
}

/** Prefix an internal path with the locale: href("he", "/shop") -> "/he/shop" */
export function href(lang: Locale, path: string): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean === "/" ? `/${lang}` : `/${lang}${clean}`;
}

/** Same page in another language (used by the language switcher). */
export function switchLocalePath(pathname: string, to: Locale): string {
  const parts = pathname.split("/");
  if (parts[1] && isLocale(parts[1])) parts[1] = to;
  else parts.splice(1, 0, to);
  return parts.join("/") || `/${to}`;
}
