import vi from "./vi.json";
import en from "./en.json";
import type { Locale } from "@/components/shared/locale-switcher";

export type Dictionary = typeof vi;

export const dictionaries: Record<Locale, Dictionary> = {
  vi,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.vi;
}

export { vi, en };
