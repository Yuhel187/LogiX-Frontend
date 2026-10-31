"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDecimal } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import type { RouteSummary } from "../types";

export function RouteSummaryPanel({
  route,
  selected,
}: {
  route: RouteSummary;
  selected: boolean;
}) {
  const { t, locale } = useTranslation();
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{t(`transport.route.${route.source}`)}</Badge>
        {selected ? <Badge>{t("transport.route.approvedRoute")}</Badge> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("transport.route.version", { version: route.planVersion })}
      </p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          ["distance", route.distanceKm],
          ["duration", route.durationMinutes],
        ].map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs text-muted-foreground">{t(`transport.route.${key}`)}</dt>
            <dd>{value === null || value === undefined
              ? t("transport.route.unknownMetric")
              : formatDecimal(value, locale)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-xs text-muted-foreground">{t("transport.route.vehicleSnapshot")}</dt>
          <dd className="break-words">{route.vehicleLabel ?? t("transport.fields.unassigned")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("transport.route.driverSnapshot")}</dt>
          <dd className="break-words">{route.driverLabel ?? t("transport.fields.unassigned")}</dd>
        </div>
      </dl>
      {route.approvedByLabel && route.approvedAt ? (
        <p className="break-words text-xs text-muted-foreground">
          {t("transport.route.approvedBy", {
            actor: route.approvedByLabel,
            time: formatDateTime(route.approvedAt, locale),
          })}
        </p>
      ) : null}
    </section>
  );
}
