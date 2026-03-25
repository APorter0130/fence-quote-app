"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const lastGeocodedPointRef = useRef<[number, number] | null>(null);
  const pointsRef = useRef<number[][]>([]);
  const pointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [, setDebug] = useState("idle");
  const [, setGeocodeDebug] = useState("");
  const [totalFeet, setTotalFeet] = useState(0);
  const [isParcelLoading, setIsParcelLoading] = useState(false);
  const [keepParcelOverlay, setKeepParcelOverlay] = useState(true);
  const [parcelMessage, setParcelMessage] = useState("");
  const [parcelMessageIsError, setParcelMessageIsError] = useState(false);
  const onDistanceChangeRef = useRef<Props["onDistanceChange"]>(onDistanceChange);

  useEffect(() => {
    onDistanceChangeRef.current = onDistanceChange;
  }, [onDistanceChange]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const clearParcelBoundary = (map: mapboxgl.Map | null) => {
    if (!map) return;

    if (map.getLayer("parcel-boundary-line")) {
      map.removeLayer("parcel-boundary-line");
    }

    if (map.getLayer("parcel-boundary-fill")) {
      map.removeLayer("parcel-boundary-fill");
    }

    if (map.getSource("parcel-boundary")) {
      map.removeSource("parcel-boundary");
    }
  };

  const getBoundsFromGeometry = (
    geometry: { type: string; coordinates: unknown } | undefined
  ): [[number, number], [number, number]] | null => {
    if (!geometry) return null;

    const allPoints: number[][] = [];

    if (geometry.type === "Polygon") {
      const polygonCoords = geometry.coordinates as number[][][];
      polygonCoords.forEach((ring) => ring.forEach((point) => allPoints.push(point)));
    }

    if (geometry.type === "MultiPolygon") {
      const multiPolygonCoords = geometry.coordinates as number[][][][];
      multiPolygonCoords.forEach((polygon) =>
        polygon.forEach((ring) => ring.forEach((point) => allPoints.push(point)))
      );
    }

    if (allPoints.length === 0) return null;

    const lngs = allPoints.map((point) => point[0]);
    const lats = allPoints.map((point) => point[1]);

    return [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
  };

  const getPrimaryRing = (
    geometry: { type: string; coordinates: unknown } | undefined
  ): number[][] => {
    if (!geometry) return [];

    if (geometry.type === "Polygon") {
      const polygonCoords = geometry.coordinates as number[][][];
      return polygonCoords[0] ?? [];
    }

    if (geometry.type === "MultiPolygon") {
      const multiPolygonCoords = geometry.coordinates as number[][][][];
      return multiPolygonCoords[0]?.[0] ?? [];
    }

    return [];
  };

  const drawParcelBoundary = (
    parcelFeature: {
      type: "Feature";
      geometry: { type: string; coordinates: unknown };
      properties?: Record<string, unknown>;
    }
  ) => {
    const map = mapRef.current;
    if (!map) return;

    const sourceData = {
      type: "FeatureCollection",
      features: [parcelFeature],
    };

    const existingSource = map.getSource("parcel-boundary") as mapboxgl.GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(sourceData as never);
    } else {
      map.addSource("parcel-boundary", {
        type: "geojson",
        data: sourceData as never,
      });

      map.addLayer({
        id: "parcel-boundary-fill",
        type: "fill",
        source: "parcel-boundary",
        paint: {
          "fill-color": "#22c55e",
          "fill-opacity": 0.2,
        },
      });

      map.addLayer({
        id: "parcel-boundary-line",
        type: "line",
        source: "parcel-boundary",
        paint: {
          "line-width": 2,
          "line-color": "#4ade80",
        },
      });
    }

    const ring = getPrimaryRing(parcelFeature.geometry);
    if (ring.length >= 2) {
      pointMarkersRef.current.forEach((marker) => marker.remove());
      pointMarkersRef.current = [];
      pointsRef.current = ring;
      syncFenceLine(map);
    }

    const bounds = getBoundsFromGeometry(parcelFeature.geometry);
    if (bounds) {
      map.fitBounds(bounds, { padding: 80 });
    }
  };

  const useParcelBoundary = async () => {
    const point = lastGeocodedPointRef.current;
    if (!point) {
      setDebug("find address first");
      setParcelMessage("Find Address first, then use property lines.");
      setParcelMessageIsError(true);
      return;
    }

    setIsParcelLoading(true);
    setDebug("checking parcel data");
    setParcelMessage("");
    setParcelMessageIsError(false);

    try {
      const [lon, lat] = point;
      setDebug(`parcel lookup lat=${lat.toFixed(6)} lon=${lon.toFixed(6)}`);
      console.log("parcel lookup lat/lon", { lat, lon, address });
      const radii = [25, 50, 100, 250, 500];
      let found = false;
      let lastError = "No property lines found for this location.";

      for (const radius of radii) {
        const res = await fetch(`/api/parcel-boundary?lat=${lat}&lon=${lon}&radius=${radius}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await res.json()) as {
          error?: string;
          details?: string;
          source?: string;
          note?: string;
          parcel?: {
            type: "Feature";
            geometry: { type: string; coordinates: unknown };
            properties?: Record<string, unknown>;
          };
        };

        if (res.ok && payload.parcel) {
          drawParcelBoundary(payload.parcel);
          setDebug("parcel loaded");
          setParcelMessage(`Property lines loaded (radius ${radius}m).`);
          setParcelMessageIsError(false);
          found = true;
          break;
        }

        lastError = payload.details ?? payload.error ?? "parcel not found";

        if (res.status !== 404) {
          break;
        }
      }

      if (!found) {
        const noParcelMessage =
          "Property line data is unavailable for this address, but you can still trace your fence manually on the map.";
        const isNoParcel = /no parcel found/i.test(lastError);

        setDebug(isNoParcel ? "property line data unavailable" : lastError);
        setParcelMessage(isNoParcel ? noParcelMessage : lastError);
        setParcelMessageIsError(true);
      }
    } catch {
      setDebug("property line lookup failed");
      setParcelMessage("Property line lookup failed. Please try again.");
      setParcelMessageIsError(true);
    } finally {
      setIsParcelLoading(false);
    }
  };

  const syncFenceLine = useCallback((map: mapboxgl.Map) => {
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

      setTotalFeet(roundedFeet);
      onDistanceChangeRef.current?.(roundedFeet);
      return;
    }

    setTotalFeet(0);
    onDistanceChangeRef.current?.(0);
  }, []);

  const clearDrawing = () => {
    pointsRef.current = [];
    pointMarkersRef.current.forEach((marker) => marker.remove());
    pointMarkersRef.current = [];

    if (!keepParcelOverlay) {
      clearParcelBoundary(mapRef.current);
    }

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

    if (!keepParcelOverlay) {
      clearParcelBoundary(mapRef.current);
    }

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
          if (!keepParcelOverlay) {
            clearParcelBoundary(map);
          }

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
  }, [keepParcelOverlay, syncFenceLine]);

  useEffect(() => {
    if (!mapRef.current || !address?.trim()) return;
    if (!searchTrigger) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const encoded = encodeURIComponent(address);

    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=5&types=address&autocomplete=false&country=us`
    )
      .then((res) => res.json())
      .then((data) => {
        const bestFeature = data?.features?.[0];
        const coords = bestFeature?.center;

        if (!coords || !mapRef.current) {
          setGeocodeDebug("No address-level geocode result");
          return;
        }

        lastGeocodedPointRef.current = [coords[0], coords[1]];
        setGeocodeDebug(
          `${bestFeature.place_name ?? "Unknown"} (lon ${coords[0].toFixed(6)}, lat ${coords[1].toFixed(6)})`
        );
        setParcelMessage("");
        setParcelMessageIsError(false);

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
        setGeocodeDebug("Geocode failed");
      });
  }, [searchTrigger, address]);

  return (
    <div className="space-y-2">

      <div className="text-sm font-medium text-emerald-300">Total: {totalFeet} ft</div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useParcelBoundary}
          disabled={isParcelLoading}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {isParcelLoading ? "Loading..." : "Show Property Lines"}
        </button>
        <button
          type="button"
          onClick={undoLastPoint}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-100 sm:w-auto"
        >
          Undo Point
        </button>
        <button
          type="button"
          onClick={clearDrawing}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-100 sm:w-auto"
        >
          Clear Fence
        </button>
        <button
          type="button"
          onClick={() => setKeepParcelOverlay((prev) => !prev)}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-100 sm:w-auto"
        >
          {keepParcelOverlay ? "Property Lines: On" : "Property Lines: Off"}
        </button>
      </div>

      {parcelMessage ? (
        <div
          className={
            parcelMessageIsError
              ? "rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              : "rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
          }
        >
          {parcelMessage}
        </div>
      ) : null}

      <div className="w-full rounded-2xl border border-black/10 overflow-hidden">
        <div
          id="fence-map-container"
          ref={containerRef}
          style={{ width: "100%", height: "clamp(280px, 42vh, 500px)" }}
        />
      </div>
    </div>
  );
}


