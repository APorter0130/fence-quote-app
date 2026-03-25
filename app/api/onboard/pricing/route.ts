import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "../../../../lib/supabase";
import { FENCE_TYPES, FENCE_HEIGHTS } from "../../../../types/quote";
import type { FenceType, FenceHeight } from "../../../../types/quote";

type ContractorEmbedSettings = {
  embed_enabled: boolean;
  iframe_parent_origins: string;
  require_embed_signature: boolean;
  brand_primary_color: string;
  brand_secondary_color: string;
};

async function resolveContractorByToken(
  token: string
): Promise<{ id: string; slug: string; settings: ContractorEmbedSettings } | null> {
  if (!token || token.length !== 64) return null;

  const { data } = await supabase
    .from("contractors")
    .select("*")
    .eq("edit_token", token)
    .maybeSingle<Record<string, unknown>>();

  if (!data || typeof data.id !== "string" || typeof data.slug !== "string") {
    return null;
  }

  const settings: ContractorEmbedSettings = {
    embed_enabled: data.embed_enabled !== false,
    iframe_parent_origins:
      typeof data.iframe_parent_origins === "string" ? data.iframe_parent_origins : "",
    require_embed_signature: data.require_embed_signature === true,
    brand_primary_color:
      typeof data.brand_primary_color === "string" ? data.brand_primary_color : "",
    brand_secondary_color:
      typeof data.brand_secondary_color === "string" ? data.brand_secondary_color : "",
  };

  return { id: data.id, slug: data.slug, settings };
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

  return NextResponse.json({
    contractor: { id: contractor.id, slug: contractor.slug },
    pricing: data ?? [],
    settings: contractor.settings,
  });
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

type PricingChangeMetadata = {
  source?: "manual" | "csv-import";
  file_name?: string;
};

type ExistingPricingRow = PricingRowInput & {
  contractor_id: string;
};

function buildPricingAuditEmail(params: {
  contractorSlug: string;
  rowsSaved: number;
  source: string;
  fileName: string;
  changedAtIso: string;
  logId: string;
  insertedRows: number;
  updatedRows: number;
  unchangedRows: number;
}) {
  const {
    contractorSlug,
    rowsSaved,
    source,
    fileName,
    changedAtIso,
    logId,
    insertedRows,
    updatedRows,
    unchangedRows,
  } = params;

  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#111827">
    <h2 style="margin:0 0 14px 0;font-size:20px">Pricing Change Audit</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:6px 0;color:#6b7280">Contractor</td><td style="padding:6px 0">${contractorSlug}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Rows Saved</td><td style="padding:6px 0">${rowsSaved}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Source</td><td style="padding:6px 0">${source}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">File</td><td style="padding:6px 0">${fileName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Changed At</td><td style="padding:6px 0">${changedAtIso}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Log ID</td><td style="padding:6px 0">${logId}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Inserted Rows</td><td style="padding:6px 0">${insertedRows}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Updated Rows</td><td style="padding:6px 0">${updatedRows}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">Unchanged Rows</td><td style="padding:6px 0">${unchangedRows}</td></tr>
    </table>
  </div>`;
}

function hasPricingDiff(prev: ExistingPricingRow, next: PricingRowInput) {
  return (
    Number(prev.price_per_foot) !== Number(next.price_per_foot) ||
    Number(prev.grade_multiplier_flat) !== Number(next.grade_multiplier_flat) ||
    Number(prev.grade_multiplier_moderate) !== Number(next.grade_multiplier_moderate) ||
    Number(prev.grade_multiplier_steep) !== Number(next.grade_multiplier_steep) ||
    Number(prev.gate_price) !== Number(next.gate_price) ||
    Number(prev.tear_out_fee) !== Number(next.tear_out_fee) ||
    Number(prev.minimum_job_price) !== Number(next.minimum_job_price) ||
    Number(prev.estimate_high_multiplier) !== Number(next.estimate_high_multiplier) ||
    prev.is_active !== next.is_active
  );
}

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

  const rawRows = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { pricing?: unknown }).pricing)
      ? ((body as { pricing: unknown[] }).pricing ?? [])
      : null;

  if (!rawRows) {
    return NextResponse.json(
      { error: "Expected an array of pricing rows or { pricing, settings }." },
      { status: 400 }
    );
  }

  const metadata =
    body && typeof body === "object" && !Array.isArray(body)
      ? (((body as { metadata?: unknown }).metadata ?? {}) as PricingChangeMetadata)
      : {};

  const validFenceTypes = new Set<string>(FENCE_TYPES);
  const validFenceHeights = new Set<string>(FENCE_HEIGHTS);

  const rows: PricingRowInput[] = [];

  for (const row of rawRows) {
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

  const { data: existingRowsRaw } = await supabase
    .from("contractor_pricing")
    .select(
      "contractor_id,fence_type,fence_height,price_per_foot,grade_multiplier_flat,grade_multiplier_moderate,grade_multiplier_steep,gate_price,tear_out_fee,minimum_job_price,estimate_high_multiplier,is_active"
    )
    .eq("contractor_id", contractor.id);

  const existingRows = (existingRowsRaw ?? []) as ExistingPricingRow[];
  const existingByKey = new Map<string, ExistingPricingRow>();
  for (const row of existingRows) {
    existingByKey.set(`${row.fence_type}__${row.fence_height}`, row);
  }

  let insertedRows = 0;
  let updatedRows = 0;
  let unchangedRows = 0;

  for (const nextRow of rows) {
    const key = `${nextRow.fence_type}__${nextRow.fence_height}`;
    const previous = existingByKey.get(key);

    if (!previous) {
      insertedRows += 1;
      continue;
    }

    if (hasPricingDiff(previous, nextRow)) {
      updatedRows += 1;
    } else {
      unchangedRows += 1;
    }
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

  const rawSettings =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { settings?: unknown }).settings
      : undefined;

  if (rawSettings && typeof rawSettings === "object") {
    const settings = rawSettings as Record<string, unknown>;
    const updatePayload: Record<string, unknown> = {};

    if (typeof settings.embed_enabled === "boolean") {
      updatePayload.embed_enabled = settings.embed_enabled;
    }
    if (typeof settings.iframe_parent_origins === "string") {
      updatePayload.iframe_parent_origins = settings.iframe_parent_origins;
    }
    if (typeof settings.require_embed_signature === "boolean") {
      updatePayload.require_embed_signature = settings.require_embed_signature;
    }
    if (typeof settings.brand_primary_color === "string") {
      updatePayload.brand_primary_color = settings.brand_primary_color;
    }
    if (typeof settings.brand_secondary_color === "string") {
      updatePayload.brand_secondary_color = settings.brand_secondary_color;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: contractorUpdateError } = await supabase
        .from("contractors")
        .update(updatePayload)
        .eq("id", contractor.id);

      if (contractorUpdateError) {
        return NextResponse.json(
          {
            error:
              "Pricing saved, but embed settings failed to save. You may need contractor embed columns in Supabase.",
            details: contractorUpdateError.message,
          },
          { status: 500 }
        );
      }
    }
  }

  const auditEmail = process.env.PRICING_AUDIT_EMAIL?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const changedAtIso = new Date().toISOString();
  let pricingChangeLogId = "n/a";

  const { data: pricingLogRow, error: pricingLogError } = await supabase
    .from("pricing_change_log")
    .insert({
      contractor_id: contractor.id,
      source: metadata.source ?? "manual",
      file_name: metadata.file_name ?? null,
      rows_saved: rows.length,
      inserted_rows: insertedRows,
      updated_rows: updatedRows,
      unchanged_rows: unchangedRows,
      changed_at: changedAtIso,
      change_summary: {
        total_rows_submitted: rows.length,
        inserted_rows: insertedRows,
        updated_rows: updatedRows,
        unchanged_rows: unchangedRows,
      },
      metadata: metadata,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (pricingLogError) {
    console.error("Pricing change log insert skipped:", pricingLogError.message);
  } else if (pricingLogRow?.id) {
    pricingChangeLogId = pricingLogRow.id;
  }

  if (auditEmail && resendKey) {
    const resend = new Resend(resendKey);

    void resend.emails
      .send({
        from: process.env.RESEND_FROM_EMAIL ?? "quotes@fenceestimate.app",
        to: auditEmail,
        subject: `Pricing updated: ${contractor.slug}`,
        html: buildPricingAuditEmail({
          contractorSlug: contractor.slug,
          rowsSaved: rows.length,
          source: metadata.source ?? "manual",
          fileName: metadata.file_name ?? "n/a",
          changedAtIso,
          logId: pricingChangeLogId,
          insertedRows,
          updatedRows,
          unchangedRows,
        }),
      })
      .catch((error) => {
        console.error("Pricing audit email failed:", error);
      });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
