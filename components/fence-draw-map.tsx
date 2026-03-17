"use client";

import Map from "react-map-gl/mapbox";
import { useState } from "react";

type Props = {
  address?: string;
  onDistanceChange: (feet: number) => void;
};

export default function FenceDrawMap({ onDistanceChange }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [mapError, setMapError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-sm text-yellow-200">
        Token loaded: {token ? `YES (${token.slice(0, 10)}...)` : "NO"}
      </div>

      {mapError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          Map error: {mapError}
        </div>
      ) : null}

      <div style={{ height: 420, width: "100%" }} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-800">
        <Map
          reuseMaps
          mapboxAccessToken={token}
          initialViewState={{
            longitude: -90.5,
            latitude: 38.65,
            zoom: 10,
          }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onError={(e) => setMapError(e.error?.message ?? "Unknown error")}
        />
      </div>
    </div>
  );
}
