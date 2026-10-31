"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface DeliveryMapPoint {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}

export interface DeliveryRouteMapProps {
  depot: DeliveryMapPoint;
  stops: DeliveryMapPoint[];
  geometry: [number, number][] | null;
  label: string;
}

export function DeliveryRouteMap({
  depot,
  stops,
  geometry,
  label,
}: DeliveryRouteMapProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    const color = getComputedStyle(container.current)
      .getPropertyValue("--primary").trim();
    const points: [number, number][] = [
      [depot.latitude, depot.longitude],
      ...stops.map((stop): [number, number] => [stop.latitude, stop.longitude]),
      [depot.latitude, depot.longitude],
    ];
    L.polyline(geometry ?? points, {
      color,
      weight: 4,
      ...(geometry ? {} : { dashArray: "6, 8" }),
    }).addTo(map);
    [depot, ...stops].forEach((point, index) => {
      const popup = document.createElement("span");
      popup.textContent = `${index === 0 ? "" : `${index}. `}${point.label}`;
      L.circleMarker([point.latitude, point.longitude], {
        radius: index === 0 ? 9 : 6,
        color,
        fillColor: color,
        fillOpacity: 0.85,
      }).addTo(map).bindPopup(popup);
    });
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 15 });
    const theme = new MutationObserver(() => {
      if (!container.current) return;
      const nextColor = getComputedStyle(container.current).getPropertyValue("--primary").trim();
      map.eachLayer((layer) => {
        if (layer instanceof L.Path) layer.setStyle({ color: nextColor, fillColor: nextColor });
      });
    });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      theme.disconnect();
      map.remove();
    };
  }, [depot, stops, geometry]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      className="relative z-0 h-80 w-full rounded-lg border border-border bg-muted md:h-96"
    />
  );
}
