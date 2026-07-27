"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

const defaultCenter: [number, number] = [40.7128, -74.006];

type GuardianAlert = {
  id: string;
  title: string;
  description: string | null;
  severity: "urgent" | "warning" | "safe";
  instruction: string | null;
  source: string;
};

type AlertResponse = {
  city: string;
  lat: number;
  lon: number;
  provider: string;
  status: string;
  alerts: GuardianAlert[];
};

const fallbackAlerts: GuardianAlert[] = [
  {
    id: "fallback-weather",
    title: "Demo weather warning",
    description: "Guardian can check live weather alerts after you share location.",
    severity: "warning",
    instruction: "Use live location to check alerts near you.",
    source: "MyAgent demo"
  },
  {
    id: "fallback-accident",
    title: "Demo traffic accident",
    description: "Real traffic data can be added later with a traffic provider.",
    severity: "urgent",
    instruction: "Guardian would suggest leaving earlier or drafting a delay note.",
    source: "MyAgent demo"
  }
];

function markerIcon(severity: string) {
  const label = severity === "urgent" ? "!" : severity === "warning" ? "i" : "OK";

  return L.divIcon({
    className: "",
    html: `<span class="guardian-alert-marker ${severity}">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -12]
  });
}

function userIcon() {
  return L.divIcon({
    className: "",
    html: '<span class="guardian-user-marker"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10]
  });
}

function alertPosition(center: [number, number], index: number): [number, number] {
  const offsets: Array<[number, number]> = [
    [0.008, 0.004],
    [-0.007, -0.006],
    [0.004, -0.01],
    [-0.01, 0.008],
    [0.011, -0.002]
  ];
  const offset = offsets[index % offsets.length];
  return [center[0] + offset[0], center[1] + offset[1]];
}

export function GuardianMap() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const alertLayerRef = useRef<L.LayerGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const [status, setStatus] = useState("Using demo city alerts.");
  const [isLocating, setIsLocating] = useState(false);
  const [alertCount, setAlertCount] = useState(fallbackAlerts.length);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) {
      return;
    }

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    alertLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    renderAlerts(defaultCenter, fallbackAlerts);

    leafletRef.current = map;

    return () => {
      map.remove();
      leafletRef.current = null;
    };
  }, []);

  function renderAlerts(position: [number, number], alerts: GuardianAlert[]) {
    const map = leafletRef.current;
    const alertLayer = alertLayerRef.current;
    if (!map || !alertLayer) {
      return;
    }

    alertLayer.clearLayers();

    L.circle(position, {
      color: "#367a7a",
      fillColor: "#367a7a",
      fillOpacity: 0.08,
      radius: 1800,
      weight: 2
    }).addTo(alertLayer);

    alerts.forEach((alert, index) => {
      const point = alertPosition(position, index);
      const detail = alert.description ?? "No description provided.";
      const instruction = alert.instruction ? `<br /><br /><em>${alert.instruction}</em>` : "";

      L.marker(point, { icon: markerIcon(alert.severity) })
        .addTo(alertLayer)
        .bindPopup(`<strong>${alert.title}</strong><br />${detail}${instruction}<br /><br />${alert.source}`);
    });

    setAlertCount(alerts.length);
  }

  function renderUser(position: [number, number]) {
    const userLayer = userLayerRef.current;
    if (!userLayer) {
      return;
    }

    userLayer.clearLayers();
    L.marker(position, { icon: userIcon() }).addTo(userLayer).bindPopup("Your live location");
  }

  async function useLiveLocation() {
    if (!navigator.geolocation) {
      setStatus("This browser does not support live location.");
      return;
    }

    setIsLocating(true);
    setStatus("Waiting for browser location permission...");

    navigator.geolocation.getCurrentPosition(
      async (geoPosition) => {
        const position: [number, number] = [geoPosition.coords.latitude, geoPosition.coords.longitude];

        renderUser(position);
        leafletRef.current?.setView(position, 13);

        try {
          const params = new URLSearchParams({
            lat: String(position[0]),
            lon: String(position[1]),
            city: "Live location"
          });
          const data = await apiFetch<AlertResponse>(`/alerts/nearby?${params.toString()}`);
          renderAlerts(position, data.alerts.length > 0 ? data.alerts : fallbackAlerts);
          setStatus(
            data.alerts.length > 0
              ? `Live location active. Found ${data.alerts.length} ${data.provider.toUpperCase()} alert(s).`
              : "Live location active. No active NWS alerts found, showing demo Guardian scenarios."
          );
        } catch {
          renderAlerts(position, fallbackAlerts);
          setStatus("Live location active, but the alerts API is not reachable. Showing demo Guardian scenarios.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setStatus("Location permission was denied or unavailable.");
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 120000,
        timeout: 12000
      }
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-white shadow-soft">
      <div ref={mapRef} className="h-[520px] w-full bg-panel" />
      <div className="flex flex-col gap-3 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Guardian Live Location</p>
          <p className="mt-1 text-xs text-ink/60">
            {status} Showing {alertCount} alert marker(s).
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLocating}
          onClick={useLiveLocation}
        >
          <LocateFixed size={16} />
          {isLocating ? "Locating..." : "Use live location"}
        </button>
      </div>
    </div>
  );
}

