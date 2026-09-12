"use client";

import { useTranslation } from "@/lib/i18n";

export default function WorkspacePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col p-6 items-center justify-center h-full text-center">
      <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">
        {t("home.welcomeTitle")}
      </h1>
      <p className="text-muted-foreground text-sm max-w-lg">
        {t("home.welcomeDescription")}
      </p>
    </div>
  );
}
