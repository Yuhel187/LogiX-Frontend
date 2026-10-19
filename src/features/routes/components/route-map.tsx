"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoutePlan } from "../types";

interface RouteMapProps {
  routePlan: RoutePlan;
  showBaseline?: boolean;
  onToggleBaseline?: (show: boolean) => void;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string | null) => void;
}

export function RouteMap({
  routePlan,
  showBaseline = true,
  onToggleBaseline,
  selectedStopId,
  onSelectStop,
}: RouteMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const layersRef = React.useRef<{
    osrmGlow?: L.Polyline;
    osrmLine?: L.Polyline;
    baselineLine?: L.Polyline;
    markers: L.Marker[];
  }>({ markers: [] });

  // Initialize Map with OpenStreetMap Standard
  React.useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = [routePlan.depot.lat, routePlan.depot.lng];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false,
    });

    // Add Zoom Control to bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // OpenStreetMap Standard Layer (100% Free, Open Source, No API Key)
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [routePlan.depot.lat, routePlan.depot.lng]);

  // Update Route Polyline & Markers
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old layers
    if (layersRef.current.osrmGlow) map.removeLayer(layersRef.current.osrmGlow);
    if (layersRef.current.osrmLine) map.removeLayer(layersRef.current.osrmLine);
    if (layersRef.current.baselineLine) map.removeLayer(layersRef.current.baselineLine);
    layersRef.current.markers.forEach((m) => map.removeLayer(m));
    layersRef.current.markers = [];

    // 1. Draw Baseline Polyline if enabled
    if (showBaseline && routePlan.baselinePolyline.length > 0) {
      const baseline = L.polyline(routePlan.baselinePolyline, {
        color: "#f97316",
        weight: 3,
        dashArray: "8, 8",
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      baseline.bindTooltip(
        `<div class="text-xs font-semibold text-orange-600">Tuyến ban đầu (Baseline: ${routePlan.baselineDistanceKm} km)</div>`,
        { sticky: true }
      );
      layersRef.current.baselineLine = baseline;
    }

    // 2. Draw OSRM Road Network Polyline (Glow effect + Main Line)
    if (routePlan.osrmPolyline.length > 0) {
      const glow = L.polyline(routePlan.osrmPolyline, {
        color: "#3b82f6",
        weight: 8,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      const mainLine = L.polyline(routePlan.osrmPolyline, {
        color: "#1d4ed8",
        weight: 4.5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      mainLine.bindTooltip(
        `<div class="text-xs font-bold text-blue-700">Tuyến OSRM tối ưu (${routePlan.totalDistanceKm} km · ${routePlan.totalDurationMinutes} phút)</div>`,
        { sticky: true }
      );

      layersRef.current.osrmGlow = glow;
      layersRef.current.osrmLine = mainLine;
    }

    // 3. Add Depot Marker (Icon Kho hàng đặc biệt)
    const depotIconHtml = `
      <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-600 text-white shadow-xl ring-4 ring-white border border-emerald-700 transition-transform duration-300 hover:scale-110">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
          <path d="M6 18h12"/>
          <path d="M6 14h12"/>
        </svg>
        <span class="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white"></span>
        </span>
      </div>
    `;

    const depotIcon = L.divIcon({
      html: depotIconHtml,
      className: "custom-depot-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22],
    });

    const depotMarker = L.marker([routePlan.depot.lat, routePlan.depot.lng], {
      icon: depotIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    depotMarker.bindPopup(`
      <div class="p-2 space-y-1 font-sans">
        <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit">Điểm xuất phát & kết thúc (Depot)</div>
        <div class="font-bold text-sm text-foreground">${routePlan.depot.name}</div>
        <div class="text-xs text-muted-foreground">${routePlan.depot.address}</div>
        <div class="text-xs pt-1 border-t text-muted-foreground">Xe: <span class="font-semibold text-foreground">${routePlan.vehiclePlate}</span></div>
      </div>
    `);
    layersRef.current.markers.push(depotMarker);

    // 4. Add Customer Stop Markers (Đánh số 1, 2, 3...)
    routePlan.stops.forEach((stop) => {
      const isSelected = selectedStopId === stop.id;
      const stopIconHtml = `
        <div class="group relative flex items-center justify-center w-8 h-8 rounded-full ${
          isSelected
            ? "bg-amber-500 ring-4 ring-amber-200 text-white scale-125 z-50"
            : "bg-indigo-600 ring-3 ring-white text-white hover:bg-indigo-700 hover:scale-110"
        } shadow-lg font-bold text-xs transition-all duration-200 cursor-pointer">
          <span>${stop.sequence}</span>
        </div>
      `;

      const stopIcon = L.divIcon({
        html: stopIconHtml,
        className: "custom-stop-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([stop.lat, stop.lng], {
        icon: stopIcon,
        zIndexOffset: isSelected ? 900 : 500,
      }).addTo(map);

      marker.on("click", () => {
        if (onSelectStop) onSelectStop(stop.id);
      });

      marker.bindPopup(`
        <div class="p-2 space-y-1.5 font-sans min-w-[200px]">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded">Điểm giao #${stop.sequence}</span>
            <span class="text-xs font-semibold text-emerald-600">+${stop.estimatedArrivalMinutes} phút</span>
          </div>
          <div class="font-bold text-sm text-foreground">${stop.stopName}</div>
          <div class="text-xs text-muted-foreground">${stop.address}</div>
          <div class="grid grid-cols-2 gap-1 pt-1.5 border-t text-xs">
            <div>Khối lượng: <span class="font-semibold">${stop.demandWeightKg} kg</span></div>
            <div>Thể tích: <span class="font-semibold">${stop.demandVolumeM3} m³</span></div>
          </div>
          <div class="text-[11px] text-muted-foreground">Khoảng cách chặng: ${stop.distanceFromPrevKm} km</div>
        </div>
      `);

      layersRef.current.markers.push(marker);
    });

    // Fit bounds to include all stops and depot
    const allCoords: [number, number][] = [
      [routePlan.depot.lat, routePlan.depot.lng],
      ...routePlan.stops.map((s): [number, number] => [s.lat, s.lng]),
    ];
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });
    }
  }, [routePlan, showBaseline, selectedStopId, onSelectStop]);

  // Fit view helper
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const allCoords: [number, number][] = [
      [routePlan.depot.lat, routePlan.depot.lng],
      ...routePlan.stops.map((s): [number, number] => [s.lat, s.lng]),
    ];
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], animate: true });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-border shadow-xs bg-muted/20">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-8 shadow-md bg-background/95 backdrop-blur-xs hover:bg-background text-xs font-medium"
          onClick={handleFitBounds}
          title="Toàn cảnh lộ trình"
        >
          <Maximize2 className="w-3.5 h-3.5 mr-1 text-primary" />
          Vừa khung hình
        </Button>
      </div>

      {/* Floating Legend Bottom-Left */}
      <div className="absolute bottom-3 left-3 z-10 bg-background/95 backdrop-blur-md p-3 rounded-lg border border-border/80 shadow-lg text-xs space-y-2 max-w-[280px]">
        <div className="font-semibold text-foreground text-xs flex items-center justify-between">
          <span>Chú giải bản đồ</span>
          <span className="text-[10px] text-muted-foreground font-normal">OSRM Live</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-blue-600 rounded-full ring-2 ring-blue-300" />
          <span className="text-muted-foreground">Tuyến tối ưu ({routePlan.totalDistanceKm} km)</span>
        </div>

        {showBaseline && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 border-t-2 border-dashed border-orange-500" />
            <span className="text-muted-foreground">Tuyến ban đầu ({routePlan.baselineDistanceKm} km)</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold">K</div>
          <span className="text-muted-foreground">Kho Tân Bình (Depot)</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">1..5</div>
          <span className="text-muted-foreground">Thứ tự giao hàng</span>
        </div>

        {onToggleBaseline && (
          <label className="flex items-center gap-2 pt-1.5 border-t border-border cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBaseline}
              onChange={(e) => onToggleBaseline(e.target.checked)}
              className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
            />
            <span className="text-[11px] font-medium text-foreground">So sánh tuyến ban đầu</span>
          </label>
        )}
      </div>
    </div>
  );
}
