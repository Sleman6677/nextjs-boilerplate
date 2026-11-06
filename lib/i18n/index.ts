import type { Locale } from "./config";
import ar, { type Dictionary as BaseDictionary } from "./dictionaries/ar";
import en from "./dictionaries/en";
import he from "./dictionaries/he";
import storeAr, { type StoreDictionary } from "./store/ar";
import storeEn from "./store/en";
import storeHe from "./store/he";

export type Dictionary = BaseDictionary & { store: StoreDictionary };

const dictionaries: Record<Locale, Dictionary> = {
  ar: { ...ar, store: storeAr },
  he: { ...he, store: storeHe },
  en: { ...en, store: storeEn },
};

/** Server-side dictionary lookup. Client components get theirs from I18nProvider. */
export function getDictionary(lang: Locale): Dictionary {
  return dictionaries[lang];
}
