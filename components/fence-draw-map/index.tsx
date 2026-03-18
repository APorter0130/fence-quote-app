"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { length as turfLength, lineString } from "@turf/turf";
import "mapbox-gl/dist/mapbox-gl.css";

type Props = {
  address?: string;
  searchTrigger?: number;
  onDistanceChange?: (feet: number) => void;
};

export default function FenceDrawMap({ address, searchTrigger, onDistanceChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const pointsRef = useRef<number[][]>([]);
  const pointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [debug, setDebug] = useState("idle");
  const [totalFeet, setTotalFeet] = useState(0);

  const syncFenceLine = (map: mapboxgl.Map) => {
    const geojson = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: pointsRef.current,
      },
      properties: {},
    };

    const source = map.getSource("fence-line") as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData(geojson as never);
    } else {
      map.addSource("fence-line", {
        type: "geojson",
        data: geojson as never,
      });

      map.addLayer({
        id: "fence-line",
        type: "line",
        source: "fence-line",
        paint: {
          "line-width": 3,
          "line-color": "#22c55e",
        },
      });
    }

    if (pointsRef.current.length >= 2) {
      const line = lineString(pointsRef.current);
      const km = turfLength(line, { units: "kilometers" });
      const feet = km * 3280.84;
      const roundedFeet = Math.round(feet);

      const lngs = pointsRef.current.map((point) => point[0]);
      const lats = pointsRef.current.map((point) => point[1]);
      const bbox: [[number, number], [number, number]] = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ];
      map.fitBounds(bbox, { padding: 80 });

      setTotalFeet(roundedFeet);
      onDistanceChange?.(roundedFeet);
      return;
    }

    setTotalFeet(0);
    onDistanceChange?.(0);
  };

  const clearDrawing = () => {
    pointsRef.current = [];
    pointMarkersRef.current.forEach((marker) => marker.remove());
    pointMarkersRef.current = [];

    const source = mapRef.current?.getSource("fence-line") as mapboxgl.GeoJSONSource | undefined;

    if (source) {
      source.setData({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [],
        },
        properties: {},
      } as never);
    }

    setTotalFeet(0);
    onDistanceChange?.(0);
  };

  const undoLastPoint = () => {
    if (pointsRef.current.length === 0) return;

    pointsRef.current.pop();
    const lastMarker = pointMarkersRef.current.pop();
    lastMarker?.remove();

    if (mapRef.current) {
      syncFenceLine(mapRef.current);
    }
  };

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setDebug("missing token");
      return;
    }

    if (!containerRef.current) {
      setDebug("missing container");
      return;
    }

    if (mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;

    const container = containerRef.current;

    const init = () => {
      if (!container || mapRef.current) return;

      try {
        setDebug("creating map");

        const map = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/satellite-v9",
          center: [-90.5517, 38.8121],
          zoom: 19,
          maxZoom: 22,
        });

        mapRef.current = map;

        map.on("load", () => {
          setDebug("map loaded");
          map.resize();

          setTimeout(() => map.resize(), 100);
          setTimeout(() => map.resize(), 300);
          setTimeout(() => map.resize(), 700);
        });

        map.on("error", (e) => {
          console.error("Mapbox error:", e);
          setDebug("map error");
        });

        map.on("click", (e) => {
          const point = [e.lngLat.lng, e.lngLat.lat];
          pointsRef.current.push(point);

          const pointMarker = new mapboxgl.Marker({ color: "#22c55e" })
            .setLngLat(point as [number, number])
            .addTo(map);
          pointMarkersRef.current.push(pointMarker);

          syncFenceLine(map);
        });
      } catch (err) {
        console.error(err);
        setDebug("init crashed");
      }
    };

    const timeout = window.setTimeout(init, 50);

    return () => {
      window.clearTimeout(timeout);

      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      pointMarkersRef.current.forEach((marker) => marker.remove());
      pointMarkersRef.current = [];
      pointsRef.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !address?.trim()) return;
    if (!searchTrigger) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const encoded = encodeURIComponent(address);

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}`
    )
      .then((res) => res.json())
      .then((data) => {
        const coords = data?.features?.[0]?.center;
        if (!coords || !mapRef.current) return;

        mapRef.current.flyTo({
          center: coords,
          zoom: 19,
          essential: true,
        });

        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new mapboxgl.Marker().setLngLat(coords).addTo(mapRef.current);
      })
      .catch((err) => {
        console.error("Geocode failed:", err);
      });
  }, [searchTrigger, address]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">Debug: {debug}</div>
      <div className="text-sm font-medium text-emerald-300">Total: {totalFeet} ft</div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={undoLastPoint}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.08]"
        >
          Undo Point
        </button>
        <button
          type="button"
          onClick={clearDrawing}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white transition hover:bg-white/[0.08]"
        >
          Clear Fence
        </button>
      </div>

      <div className="w-full rounded-2xl border border-white/10 overflow-hidden">
        <div
          id="fence-map-container"
          ref={containerRef}
          style={{ width: "100%", height: "650px" }}
        />
      </div>
    </div>
  );
}
