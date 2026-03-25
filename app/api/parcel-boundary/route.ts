import { NextRequest, NextResponse } from "next/server";

type RegridFeature = {
  type: "Feature";
  geometry?: { type: string; coordinates: unknown };
  properties?: Record<string, unknown>;
};

type RegridResponse = {
  error?: string;
  details?: string;
  parcels?: {
    features?: RegridFeature[];
  };
  features?: RegridFeature[];
};

async function fetchRegridPoint(
  token: string,
  lat: number,
  lon: number,
  radius: string
): Promise<RegridResponse> {
  const url = new URL("https://app.regrid.com/api/v2/parcels/point");
  url.searchParams.set("token", token);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("radius", radius);
  url.searchParams.set("limit", "1");
  url.searchParams.set("return_geometry", "true");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const text = await response.text();
  console.log("Regrid status:", response.status);
  console.log("Regrid raw response:", text.slice(0, 500));

  if (!response.ok) {
    return {
      error: `Regrid request failed (${response.status})`,
      details: text,
    };
  }

  const parsed: unknown = JSON.parse(text);

  if (!parsed || typeof parsed !== "object") {
    return {
      error: "Invalid Regrid response",
      details: text,
    };
  }

  return parsed as RegridResponse;
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");
  const radiusParam = req.nextUrl.searchParams.get("radius") ?? "25";

  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  const radiusNum = Number(radiusParam);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return NextResponse.json({ error: "Invalid lat/lon" }, { status: 400 });
  }

  const normalizedRadius = Number.isFinite(radiusNum)
    ? String(Math.max(5, Math.min(1000, Math.round(radiusNum))))
    : "25";

  const token = process.env.REGRID_API_KEY;

  if (!token) {
    return NextResponse.json({ error: "Missing REGRID_API_KEY" }, { status: 500 });
  }

  try {
    const regridData = await fetchRegridPoint(token, latNum, lonNum, normalizedRadius);
    const regridFeature = regridData?.parcels?.features?.[0] ?? regridData?.features?.[0];

    if (regridFeature) {
      return NextResponse.json({ parcel: regridFeature, source: "regrid" });
    }

    // Return raw Regrid payload in non-production so we can diagnose shape mismatches
    return NextResponse.json(
      {
        error: "No parcel found",
        details: regridData?.details ?? regridData?.error,
        radius: normalizedRadius,
      },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid Regrid response", details: "Unable to parse parcel lookup response." },
      { status: 500 }
    );
  }
}
