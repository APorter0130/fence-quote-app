import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
  }

  const token = process.env.REGRID_API_KEY;

  if (!token) {
    return NextResponse.json({ error: "Missing REGRID_API_KEY" }, { status: 500 });
  }

  const url = new URL("https://app.regrid.com/api/v2/parcels/point");
  url.searchParams.set("token", token);
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  url.searchParams.set("radius", "25");
  url.searchParams.set("limit", "1");
  url.searchParams.set("return_geometry", "true");

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  const text = await response.text();
  console.log("Regrid status:", response.status);
  console.log("Regrid raw text:", text);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid Regrid response", raw: text }, { status: 500 });
  }

  const feature = data?.parcels?.features?.[0];

  if (!feature) {
    return NextResponse.json({ error: "No parcel found", regrid: data }, { status: 404 });
  }

  return NextResponse.json({ parcel: feature });
}
