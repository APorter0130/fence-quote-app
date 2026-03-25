import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";
import { FENCE_HEIGHTS, FENCE_TYPES } from "../../../../../types/quote";
import type { FenceHeight, FenceType } from "../../../../../types/quote";

type ContractorEmbedSettings = {
  embed_enabled: boolean;
  iframe_parent_origins: string;
  require_embed_signature: boolean;
  brand_primary_color: string;
  brand_secondary_color: string;
};

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

type ParsedImportRow = PricingRowInput & {
  source_row: number;
};

type ImportError = {
  row: number;
  field: string;
  message: string;
};

const DEFAULT_GLOBALS = {
  gate_price: 350,
  tear_out_fee: 1200,
  minimum_job_price: 500,
  estimate_high_multiplier: 1.12,
  grade_multiplier_flat: 1,
  grade_multiplier_moderate: 1.1,
  grade_multiplier_steep: 1.2,
};

const HEADER_ALIASES: Record<string, keyof PricingRowInput | "ignore"> = {
  fence_type: "fence_type",
  material: "fence_type",
  fence_material: "fence_type",

  fence_height: "fence_height",
  height: "fence_height",

  price_per_foot: "price_per_foot",
  ppf: "price_per_foot",
  price: "price_per_foot",
  base_price: "price_per_foot",

  grade_multiplier_flat: "grade_multiplier_flat",
  flat_multiplier: "grade_multiplier_flat",

  grade_multiplier_moderate: "grade_multiplier_moderate",
  moderate_multiplier: "grade_multiplier_moderate",

  grade_multiplier_steep: "grade_multiplier_steep",
  steep_multiplier: "grade_multiplier_steep",

  gate_price: "gate_price",
  gate_fee: "gate_price",

  tear_out_fee: "tear_out_fee",
  tearout_fee: "tear_out_fee",
  tear_out: "tear_out_fee",

  minimum_job_price: "minimum_job_price",
  minimum_price: "minimum_job_price",
  min_job_price: "minimum_job_price",

  estimate_high_multiplier: "estimate_high_multiplier",
  high_multiplier: "estimate_high_multiplier",

  is_active: "is_active",
  active: "is_active",
};

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseBoolean(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return true;
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
}

function parseNumber(value: string | undefined) {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  const n = Number(normalized.replace(/[$,%\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

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

function validateAndNormalizeRows(rawRows: string[][]) {
  const errors: ImportError[] = [];
  const warnings: string[] = [];

  if (rawRows.length < 2) {
    return {
      rows: [] as ParsedImportRow[],
      errors: [{ row: 1, field: "file", message: "CSV must include a header and at least one row." }],
      warnings,
    };
  }

  const headerCells = rawRows[0].map((h) => normalizeHeader(h));
  const mappedHeaders = headerCells.map((header) => HEADER_ALIASES[header] ?? null);

  if (!mappedHeaders.includes("fence_type") || !mappedHeaders.includes("fence_height") || !mappedHeaders.includes("price_per_foot")) {
    errors.push({
      row: 1,
      field: "header",
      message: "Missing required headers. Expected fence_type, fence_height, and price_per_foot.",
    });
    return { rows: [] as ParsedImportRow[], errors, warnings };
  }

  const unknownHeaders = headerCells.filter((h, idx) => mappedHeaders[idx] === null && h.length > 0);
  if (unknownHeaders.length > 0) {
    warnings.push(`Ignored unknown headers: ${unknownHeaders.join(", ")}`);
  }

  const validTypes = new Set<string>(FENCE_TYPES);
  const validHeights = new Set<string>(FENCE_HEIGHTS);
  const dedupe = new Map<string, ParsedImportRow>();

  for (let i = 1; i < rawRows.length; i += 1) {
    const source_row = i + 1;
    const cells = rawRows[i].map((cell) => cell.trim());

    if (cells.every((c) => c.length === 0)) {
      continue;
    }

    const rowData: Record<string, string> = {};
    for (let c = 0; c < mappedHeaders.length; c += 1) {
      const mapped = mappedHeaders[c];
      if (mapped) {
        rowData[mapped] = cells[c] ?? "";
      }
    }

    const fence_type = (rowData.fence_type ?? "").toLowerCase();
    const fence_height = rowData.fence_height ?? "";

    if (!validTypes.has(fence_type)) {
      errors.push({ row: source_row, field: "fence_type", message: `Invalid fence type: ${rowData.fence_type || "(blank)"}` });
      continue;
    }

    if (!validHeights.has(fence_height)) {
      errors.push({ row: source_row, field: "fence_height", message: `Invalid fence height: ${rowData.fence_height || "(blank)"}` });
      continue;
    }

    const pricePerFoot = parseNumber(rowData.price_per_foot);
    if (pricePerFoot == null || pricePerFoot < 0) {
      errors.push({ row: source_row, field: "price_per_foot", message: "price_per_foot must be a non-negative number." });
      continue;
    }

    const gate_price = parseNumber(rowData.gate_price) ?? DEFAULT_GLOBALS.gate_price;
    const tear_out_fee = parseNumber(rowData.tear_out_fee) ?? DEFAULT_GLOBALS.tear_out_fee;
    const minimum_job_price = parseNumber(rowData.minimum_job_price) ?? DEFAULT_GLOBALS.minimum_job_price;
    const estimate_high_multiplier =
      parseNumber(rowData.estimate_high_multiplier) ?? DEFAULT_GLOBALS.estimate_high_multiplier;
    const grade_multiplier_flat =
      parseNumber(rowData.grade_multiplier_flat) ?? DEFAULT_GLOBALS.grade_multiplier_flat;
    const grade_multiplier_moderate =
      parseNumber(rowData.grade_multiplier_moderate) ?? DEFAULT_GLOBALS.grade_multiplier_moderate;
    const grade_multiplier_steep =
      parseNumber(rowData.grade_multiplier_steep) ?? DEFAULT_GLOBALS.grade_multiplier_steep;

    const numericChecks: Array<[number, string]> = [
      [gate_price, "gate_price"],
      [tear_out_fee, "tear_out_fee"],
      [minimum_job_price, "minimum_job_price"],
      [estimate_high_multiplier, "estimate_high_multiplier"],
      [grade_multiplier_flat, "grade_multiplier_flat"],
      [grade_multiplier_moderate, "grade_multiplier_moderate"],
      [grade_multiplier_steep, "grade_multiplier_steep"],
    ];

    let numericFailure = false;
    for (const [value, field] of numericChecks) {
      if (!Number.isFinite(value) || value < 0) {
        errors.push({ row: source_row, field, message: `${field} must be a non-negative number.` });
        numericFailure = true;
      }
    }

    if (numericFailure) {
      continue;
    }

    const parsedActive = parseBoolean(rowData.is_active);
    if (parsedActive == null) {
      errors.push({ row: source_row, field: "is_active", message: "is_active must be true/false, yes/no, or 1/0." });
      continue;
    }

    const normalized: ParsedImportRow = {
      source_row,
      fence_type: fence_type as FenceType,
      fence_height: fence_height as FenceHeight,
      price_per_foot: pricePerFoot,
      grade_multiplier_flat,
      grade_multiplier_moderate,
      grade_multiplier_steep,
      gate_price,
      tear_out_fee,
      minimum_job_price,
      estimate_high_multiplier,
      is_active: parsedActive,
    };

    const key = `${normalized.fence_type}__${normalized.fence_height}`;
    if (dedupe.has(key)) {
      warnings.push(`Duplicate row for ${normalized.fence_type}/${normalized.fence_height}; kept later row ${source_row}.`);
    }
    dedupe.set(key, normalized);
  }

  return {
    rows: Array.from(dedupe.values()).sort((a, b) => a.fence_type.localeCompare(b.fence_type) || Number(a.fence_height) - Number(b.fence_height)),
    errors,
    warnings,
  };
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const contractor = await resolveContractorByToken(token);

  if (!contractor) {
    return NextResponse.json({ error: "Invalid or expired setup token." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing CSV file." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported in this version." }, { status: 400 });
  }

  const rawText = await file.text();
  const parsed = parseCsv(rawText);
  const { rows, errors, warnings } = validateAndNormalizeRows(parsed);

  if (errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        errors,
        warnings,
        parsed_rows: rows.length,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    contractor: { id: contractor.id, slug: contractor.slug },
    rows,
    warnings,
    parsed_rows: rows.length,
  });
}
