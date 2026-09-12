"use client";

import * as React from "react";
import viTranslations from "./locales/vi.json";
import enTranslations from "./locales/en.json";

export type LocaleCode = "vi" | "en" | string;

export interface LocaleItem {
  code: LocaleCode;
  name: string;
}

export const availableLocales: LocaleItem[] = [
  { code: "vi", name: "Tiếng Việt" },
  { code: "en", name: "English" },
];

export const defaultLocale: LocaleCode = "vi";

const translationsMap: Record<string, Record<string, unknown>> = {
  vi: viTranslations,
  en: enTranslations,
};

interface I18nContextType {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  locales: LocaleItem[];
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = "logix_locale";

const listeners = new Set<() => void>();

function subscribeLocale(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getLocaleSnapshot(): LocaleCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in translationsMap) {
      return saved as LocaleCode;
    }
  } catch {
    // Ignore
  }
  return defaultLocale;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const storeLocale = React.useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    () => defaultLocale
  );
  const [overrideLocale, setOverrideLocale] = React.useState<LocaleCode | null>(null);

  const locale = overrideLocale ?? storeLocale;

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = React.useCallback((newLocale: LocaleCode) => {
    if (newLocale in translationsMap) {
      setOverrideLocale(newLocale);
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
      } catch {
        // Ignore
      }
      listeners.forEach((listener) => listener());
    }
  }, []);

  const t = React.useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const currentDict =
        translationsMap[locale] || translationsMap[defaultLocale];
      const fallbackDict = translationsMap[defaultLocale];

      const resolveValue = (dict: Record<string, unknown>, keyPath: string): unknown => {
        const segments = keyPath.split(".");
        let current: unknown = dict;
        for (const segment of segments) {
          if (current && typeof current === "object" && segment in current) {
            current = (current as Record<string, unknown>)[segment];
          } else {
            return undefined;
          }
        }
        return current;
      };

      let resolved = resolveValue(currentDict, path);
      if (resolved === undefined && currentDict !== fallbackDict) {
        resolved = resolveValue(fallbackDict, path);
      }

      if (typeof resolved !== "string") {
        return path;
      }

      if (params) {
        return Object.entries(params).reduce((acc, [key, val]) => {
          return acc.replaceAll(`{${key}}`, String(val));
        }, resolved);
      }

      return resolved;
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        locales: availableLocales,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

export { useTranslation as useI18n };
