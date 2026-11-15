"use client";

import { useEffect, useRef, useState } from "react";
import type * as LeafletNamespace from "leaflet";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { isPointInVietnamCorridor } from "@/features/transport/utils/route-draft";
import {
  lookupVietnamFallbackCoordinates,
  resolveVietnamAddressCoordinates,
} from "../../utils/vietnam-geocoder";

interface AddressCoordinatePickerProps {
  addressLine: string;
  ward: string;
  district: string;
  province: string;
  latitude: string;
  longitude: string;
  disabled?: boolean;
  onCoordinatesChange: (latitude: string, longitude: string) => void;
}

const DEFAULT_VIETNAM_CENTER: [number, number] = [16.054407, 108.202167];

export function AddressCoordinatePicker({
  addressLine,
  ward,
  district,
  province,
  latitude,
  longitude,
  disabled = false,
  onCoordinatesChange,
}: AddressCoordinatePickerProps) {
  const { t } = useTranslation();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const parsedLat = latitude.trim() ? Number(latitude) : Number.NaN;
  const parsedLng = longitude.trim() ? Number(longitude) : Number.NaN;
  const hasValidCoords =
    Number.isFinite(parsedLat) &&
    Number.isFinite(parsedLng) &&
    Math.abs(parsedLat) <= 90 &&
    Math.abs(parsedLng) <= 180;
  const isInVietnam =
    hasValidCoords && isPointInVietnamCorridor(parsedLat, parsedLng);

  const handleGeocode = async () => {
    setIsGeocoding(true);
    setStatusMessage(null);
    try {
      const resolved = await resolveVietnamAddressCoordinates({
        addressLine,
        ward,
        district,
        province,
      });
      if (resolved) {
        onCoordinatesChange(resolved.latitude, resolved.longitude);
        setStatusMessage(
          t("masterData.geocodeResolved", { location: resolved.displayName })
        );
        setShowMap(true);
      } else {
        setStatusMessage(t("masterData.geocodeNotFound"));
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    let cancelled = false;
    let map: LeafletNamespace.Map | null = null;
    let marker: LeafletNamespace.CircleMarker | null = null;
    let resize: ResizeObserver | null = null;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current) return;

      const fallback = lookupVietnamFallbackCoordinates({
        addressLine,
        ward,
        district,
        province,
      });
      const initialCenter: [number, number] = hasValidCoords
        ? [parsedLat, parsedLng]
        : fallback
          ? [Number(fallback.latitude), Number(fallback.longitude)]
          : DEFAULT_VIETNAM_CENTER;

      map = L.map(mapContainerRef.current).setView(
        initialCenter,
        hasValidCoords ? 14 : 11
      );

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const color =
        getComputedStyle(mapContainerRef.current)
          .getPropertyValue("--primary")
          .trim() || "#16a34a";

      if (hasValidCoords) {
        marker = L.circleMarker([parsedLat, parsedLng], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.85,
        }).addTo(map);
      }

      map.on("click", (event: LeafletNamespace.LeafletMouseEvent) => {
        if (disabled) return;
        const nextLat = event.latlng.lat.toFixed(6);
        const nextLng = event.latlng.lng.toFixed(6);
        onCoordinatesChange(nextLat, nextLng);
        setStatusMessage(
          t("masterData.mapPinSelected", { lat: nextLat, lng: nextLng })
        );
      });

      const currentMap = map;
      resize = new ResizeObserver(() => currentMap.invalidateSize());
      resize.observe(mapContainerRef.current);
    };

    void initMap();

    return () => {
      cancelled = true;
      resize?.disconnect();
      if (marker) marker.remove();
      if (map) map.remove();
    };
  }, [
    showMap,
    hasValidCoords,
    parsedLat,
    parsedLng,
    addressLine,
    ward,
    district,
    province,
    disabled,
    onCoordinatesChange,
    t,
  ]);

  const canGeocode =
    !disabled &&
    !isGeocoding &&
    Boolean(province.trim() || addressLine.trim() || district.trim());

  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0 text-primary" />
          <span>{t("masterData.geocodeHint")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!canGeocode}
            onClick={() => void handleGeocode()}
          >
            {isGeocoding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Navigation className="size-3.5" />
            )}
            {t("masterData.geocodeFromAddress")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setShowMap((prev) => !prev)}
          >
            {showMap
              ? t("masterData.hideMapPicker")
              : t("masterData.showMapPicker")}
          </Button>
        </div>
      </div>

      {hasValidCoords && !isInVietnam ? (
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
          {t("masterData.outsideVietnamWarning")}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="text-xs text-muted-foreground">{statusMessage}</p>
      ) : null}

      {showMap ? (
        <div className="space-y-1.5">
          <div
            ref={mapContainerRef}
            role="application"
            aria-label={t("masterData.mapPickerAriaLabel")}
            className="relative z-0 h-52 w-full rounded-md border border-border bg-muted cursor-crosshair"
          />
          <p className="text-[11px] text-muted-foreground">
            {t("masterData.mapClickInstruction")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
