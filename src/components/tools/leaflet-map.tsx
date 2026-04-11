"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

const DEFAULT_MARKER_ICON = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const DEFAULT_MARKER_SHADOW = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

export function LeafletMap({ lat, lon }: { lat: number; lon: number }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!instanceRef.current) {
      const icon = L.icon({
        iconUrl: DEFAULT_MARKER_ICON,
        shadowUrl: DEFAULT_MARKER_SHADOW,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const map = L.map(mapRef.current).setView([lat, lon], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      L.marker([lat, lon], { icon }).addTo(map);
      instanceRef.current = map;
      return;
    }

    instanceRef.current.setView([lat, lon], 11);
  }, [lat, lon]);

  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="h-[320px] rounded-xl border" aria-label="Location map" />;
}
