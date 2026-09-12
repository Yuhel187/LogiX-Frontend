"use client";

import { useTranslation } from "@/lib/i18n";

export type Locale = "vi" | "en";

interface LocaleSwitcherProps {
  currentLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
}

export function LocaleSwitcher({ currentLocale: propLocale, onLocaleChange }: LocaleSwitcherProps) {
  const { locale: i18nLocale, setLocale } = useTranslation();
  const activeLocale = propLocale ?? (i18nLocale as Locale);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    if (onLocaleChange) {
      onLocaleChange(newLocale);
    }
  };

  return (
    <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 p-0.5 text-xs shadow-xs">
      <button
        type="button"
        onClick={() => handleSelect("vi")}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
          activeLocale === "vi"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => handleSelect("en")}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
          activeLocale === "en"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        EN
      </button>
    </div>
  );
}
