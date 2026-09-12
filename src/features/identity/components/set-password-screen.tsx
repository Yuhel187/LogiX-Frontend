"use client";

import { useState, Suspense } from "react";
import type { Locale } from "@/components/shared/locale-switcher";
import { getDictionary } from "@/locales";
import { BrandingPanel } from "./branding-panel";
import { SetPasswordForm } from "./set-password-form";

export function SetPasswordScreen() {
  const [locale, setLocale] = useState<Locale>("vi");
  const dict = getDictionary(locale);

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      <BrandingPanel t={dict.auth} />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#090b0c]" />}>
        <SetPasswordForm
          t={dict.auth}
          currentLocale={locale}
          onLocaleChange={setLocale}
        />
      </Suspense>
    </main>
  );
}

