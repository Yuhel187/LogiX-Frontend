"use client";

export type Locale = "vi" | "en";

interface LocaleSwitcherProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export function LocaleSwitcher({ currentLocale, onLocaleChange }: LocaleSwitcherProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 p-0.5 text-xs shadow-xs">
      <button
        type="button"
        onClick={() => onLocaleChange("vi")}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
          currentLocale === "vi"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => onLocaleChange("en")}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
          currentLocale === "en"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }`}
      >
        EN
      </button>
    </div>
  );
}
