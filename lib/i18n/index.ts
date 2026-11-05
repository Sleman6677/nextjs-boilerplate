import type { Locale } from "./config";
import ar, { type Dictionary } from "./dictionaries/ar";
import en from "./dictionaries/en";
import he from "./dictionaries/he";

const dictionaries: Record<Locale, Dictionary> = { ar, he, en };

/** Server-side dictionary lookup. Client components get theirs from I18nProvider. */
export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}

export type { Dictionary };
