"use client";

import { useTranslation } from "@/lib/i18n";
import Link from "next/link";

export function EntityLabel({
  id,
  name,
  code,
  fallback,
  href,
}: {
  id: string;
  name?: string | null;
  code?: string | null;
  fallback?: string;
  href?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="break-words">
        {href ? (
          <Link href={href} className="text-primary hover:underline">
            {name || code || fallback || t("displayLabels.unavailable")}
          </Link>
        ) : (
          name || code || fallback || t("displayLabels.unavailable")
        )}
      </div>
      {name && code ? (
        <div className="break-words font-mono text-xs text-muted-foreground">
          {code}
        </div>
      ) : null}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">
          {t("displayLabels.technicalDetails")}
        </summary>
        <span className="break-all font-mono">{id}</span>
      </details>
    </div>
  );
}
