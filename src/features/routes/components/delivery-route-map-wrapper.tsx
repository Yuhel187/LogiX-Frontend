"use client";

import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/i18n";
import type { DeliveryRouteMapProps } from "./delivery-route-map";

const DynamicMap = dynamic(
  () => import("./delivery-route-map").then((module) => module.DeliveryRouteMap),
  { ssr: false, loading: MapLoading }
);

function MapLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-80 items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground md:h-96" role="status">
      {t("transport.route.loading")}
    </div>
  );
}

export function DeliveryRouteMapWrapper(props: DeliveryRouteMapProps) {
  const { t } = useTranslation();
  return (
    <section aria-label={props.label} className="space-y-2">
      <DynamicMap {...props} />
      <p className="text-xs text-muted-foreground">
        {t(props.geometry ? "transport.route.roadGeometry" : "transport.route.schematic")}
      </p>
    </section>
  );
}
