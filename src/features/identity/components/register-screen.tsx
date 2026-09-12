"use client";

import { useState } from "react";
import type { Locale } from "@/components/shared/locale-switcher";
import { getDictionary } from "@/locales";
import { BrandingPanel } from "./branding-panel";
import { RegisterForm } from "./register-form";

export function RegisterScreen() {
  const [locale, setLocale] = useState<Locale>("vi");
  const dict = getDictionary(locale);

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      <BrandingPanel t={dict.auth} />
      <RegisterForm
        t={dict.auth}
        currentLocale={locale}
        onLocaleChange={setLocale}
      />
    </main>
  );
}
