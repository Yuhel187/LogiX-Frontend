"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { moveRouteStop } from "../utils/route-draft";

interface RouteStopOrderProps {
  stops: { id: string; label: string; address: string }[];
  disabled: boolean;
  onChange: (stopIds: string[]) => void;
}

export function RouteStopOrder({
  stops,
  disabled,
  onChange,
}: RouteStopOrderProps) {
  const { t } = useTranslation();
  const ids = stops.map((stop) => stop.id);
  return (
    <ol className="space-y-2" aria-label={t("transport.route.order")}>
      {stops.map((stop, index) => (
        <li key={stop.id} className="flex items-center gap-2 rounded-md border border-border p-3">
          <span className="w-6 shrink-0 text-sm tabular-nums">{index + 1}</span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="break-words font-medium">{stop.label}</p>
            <p className="break-words text-xs text-muted-foreground">{stop.address}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled || index === 0}
              aria-label={t("transport.route.up", { sequence: index + 1 })}
              onClick={() => onChange(moveRouteStop(ids, index, -1))}
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled || index === stops.length - 1}
              aria-label={t("transport.route.down", { sequence: index + 1 })}
              onClick={() => onChange(moveRouteStop(ids, index, 1))}
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
