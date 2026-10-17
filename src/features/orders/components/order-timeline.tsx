"use client";

import { useTranslation } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import type { OrderHistoryEntry } from "../schemas/order.schema";
import { OrderStatusBadge } from "./order-status-badge";

export function OrderTimeline({ entries }: { entries: OrderHistoryEntry[] }) {
  const { t, locale } = useTranslation();

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("orders.timeline.empty")}</p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l pl-5">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-primary"
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {entry.fromStatus ? (
              <>
                <OrderStatusBadge status={entry.fromStatus} />
                <span className="text-muted-foreground">→</span>
              </>
            ) : (
              <span className="text-muted-foreground">{t("orders.timeline.created")}</span>
            )}
            <OrderStatusBadge status={entry.toStatus} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(entry.occurredAt, locale)}
            {" · "}
            {t("orders.timeline.version", { version: entry.orderVersion })}
          </div>
          {entry.reason ? (
            <p className="mt-1 text-sm">
              <span className="text-muted-foreground">{t("orders.timeline.reason")}: </span>
              {entry.reason}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
