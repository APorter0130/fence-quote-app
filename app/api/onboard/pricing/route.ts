import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { FENCE_TYPES, FENCE_HEIGHTS } from "../../../../types/quote";
import type { FenceType, FenceHeight } from "../../../../types/quote";

async function resolveContractorByToken(
  token: string
): Promise<{ id: string; slug: string } | null> {
  if (!token || token.length !== 64) return null;

  const { data } = await supabase
    .from("contractors")
    .select("id, slug")
    .eq("edit_token", token)
    .maybeSingle<{ id: string; slug: string }>();

  return data ?? null;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const contractor = await resolveContractorByToken(token);

  if (!contractor) {
    return NextResponse.json({ error: "Invalid or expired setup token." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("contractor_pricing")
    .select("*")
    .eq("contractor_id", contractor.id)
    .order("fence_type")
    .order("fence_height");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contractor, pricing: data ?? [] });
}

type PricingRowInput = {
  fence_type: FenceType;
  fence_height: FenceHeight;
  price_per_foot: number;
  grade_multiplier_flat: number;
  grade_multiplier_moderate: number;
  grade_multiplier_steep: number;
  gate_price: number;
  tear_out_fee: number;
  minimum_job_price: number;
  estimate_high_multiplier: number;
  is_active: boolean;
};

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const contractor = await resolveContractorByToken(token);

  if (!contractor) {
    return NextResponse.json({ error: "Invalid or expired setup token." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an array of pricing rows." }, { status: 400 });
  }

  const validFenceTypes = new Set<string>(FENCE_TYPES);
  const validFenceHeights = new Set<string>(FENCE_HEIGHTS);

  const rows: PricingRowInput[] = [];

  for (const row of body) {
    if (!row || typeof row !== "object") {
      return NextResponse.json({ error: "Invalid pricing row." }, { status: 400 });
    }
    const r = row as Record<string, unknown>;

    if (!validFenceTypes.has(String(r.fence_type))) {
      return NextResponse.json({ error: `Invalid fence_type: ${r.fence_type}` }, { status: 400 });
    }
    if (!validFenceHeights.has(String(r.fence_height))) {
      return NextResponse.json(
        { error: `Invalid fence_height: ${r.fence_height}` },
        { status: 400 }
      );
    }

    const numFields = [
      "price_per_foot",
      "grade_multiplier_flat",
      "grade_multiplier_moderate",
      "grade_multiplier_steep",
      "gate_price",
      "tear_out_fee",
      "minimum_job_price",
      "estimate_high_multiplier",
    ] as const;

    for (const field of numFields) {
      const val = Number(r[field]);
      if (!Number.isFinite(val) || val < 0) {
        return NextResponse.json(
          { error: `${field} must be a non-negative number.` },
          { status: 400 }
        );
      }
    }

    rows.push({
      fence_type: r.fence_type as FenceType,
      fence_height: r.fence_height as FenceHeight,
      price_per_foot: Number(r.price_per_foot),
      grade_multiplier_flat: Number(r.grade_multiplier_flat),
      grade_multiplier_moderate: Number(r.grade_multiplier_moderate),
      grade_multiplier_steep: Number(r.grade_multiplier_steep),
      gate_price: Number(r.gate_price),
      tear_out_fee: Number(r.tear_out_fee),
      minimum_job_price: Number(r.minimum_job_price),
      estimate_high_multiplier: Number(r.estimate_high_multiplier),
      is_active: r.is_active !== false,
    });
  }

  const upsertPayload = rows.map((row) => ({
    ...row,
    contractor_id: contractor.id,
  }));

  const { error: upsertError } = await supabase
    .from("contractor_pricing")
    .upsert(upsertPayload, { onConflict: "contractor_id,fence_type,fence_height" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
