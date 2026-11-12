"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { FENCE_HEIGHTS, FENCE_TYPES } from "../../../types/quote";
import type { FenceHeight, FenceType } from "../../../types/quote";

type PricingRow = {
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

type ContractorInfo = {
  id: string;
  slug: string;
};

type EmbedSettings = {
  embed_enabled: boolean;
  iframe_parent_origins: string;
  require_embed_signature: boolean;
  brand_primary_color: string;
  brand_secondary_color: string;
};

type ImportErrorRow = {
  row: number;
  field: string;
  message: string;
};

type ImportResponse = {
  ok: boolean;
  rows?: PricingRow[];
  warnings?: string[];
  errors?: ImportErrorRow[];
  error?: string;
};

type PricingChangeMetadata = {
  source: "manual" | "csv-import";
  file_name?: string;
};

const FENCE_TYPE_LABELS: Record<FenceType, string> = {
  cedar: "Cedar",
  vinyl: "Vinyl",
  "chain-link": "Chain Link",
  aluminum: "Aluminum",
};

const DEFAULT_GLOBALS = {
  gate_price: 350,
  tear_out_fee: 1200,
  minimum_job_price: 500,
  estimate_high_multiplier: 1.12,
  grade_multiplier_flat: 1.0,
  grade_multiplier_moderate: 1.1,
  grade_multiplier_steep: 1.2,
};

const DEFAULT_PPF: Record<FenceType, number> = {
  cedar: 45,
  vinyl: 52,
  "chain-link": 30,
  aluminum: 60,
};

function buildDefaultRows(): PricingRow[] {
  const rows: PricingRow[] = [];
  for (const fence_type of FENCE_TYPES) {
    for (const fence_height of FENCE_HEIGHTS) {
      rows.push({
        fence_type,
        fence_height,
        price_per_foot: DEFAULT_PPF[fence_type],
        ...DEFAULT_GLOBALS,
        is_active: true,
      });
    }
  }
  return rows;
}

function rowKey(fence_type: FenceType, fence_height: FenceHeight) {
  return `${fence_type}__${fence_height}`;
}

function buildPricingTemplateCsv() {
  const header = [
    "fence_type",
    "fence_height",
    "price_per_foot",
    "is_active",
    "grade_multiplier_flat",
    "grade_multiplier_moderate",
    "grade_multiplier_steep",
    "gate_price",
    "tear_out_fee",
    "minimum_job_price",
    "estimate_high_multiplier",
  ];

  const rows = buildDefaultRows().map((row) => [
    row.fence_type,
    row.fence_height,
    String(row.price_per_foot),
    row.is_active ? "true" : "false",
    String(row.grade_multiplier_flat),
    String(row.grade_multiplier_moderate),
    String(row.grade_multiplier_steep),
    String(row.gate_price),
    String(row.tear_out_fee),
    String(row.minimum_job_price),
    String(row.estimate_high_multiplier),
  ]);

  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function numInput(
  value: number,
  onChange: (v: number) => void,
  opts?: { step?: number; min?: number; prefix?: string }
) {
  return (
    <div className="relative">
      {opts?.prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
          {opts.prefix}
        </span>
      )}
      <input
        type="number"
        value={value}
        step={opts?.step ?? 1}
        min={opts?.min ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full rounded-xl border border-black/10 bg-white py-2 text-right text-sm text-slate-900 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10 ${opts?.prefix ? "pl-6 pr-3" : "px-3"}`}
      />
    </div>
  );
}

function OnboardSetupPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [contractor, setContractor] = useState<ContractorInfo | null>(null);
  const [rows, setRows] = useState<PricingRow[]>(buildDefaultRows());

  // Shared globals (apply to all rows)
  const [gatePrice, setGatePrice] = useState(DEFAULT_GLOBALS.gate_price);
  const [tearOutFee, setTearOutFee] = useState(DEFAULT_GLOBALS.tear_out_fee);
  const [minJobPrice, setMinJobPrice] = useState(DEFAULT_GLOBALS.minimum_job_price);
  const [highMultiplier, setHighMultiplier] = useState(DEFAULT_GLOBALS.estimate_high_multiplier);
  const [gradeFlat, setGradeFlat] = useState(DEFAULT_GLOBALS.grade_multiplier_flat);
  const [gradeMod, setGradeMod] = useState(DEFAULT_GLOBALS.grade_multiplier_moderate);
  const [gradeSteep, setGradeSteep] = useState(DEFAULT_GLOBALS.grade_multiplier_steep);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [embedEnabled, setEmbedEnabled] = useState(true);
  const [iframeParentOrigins, setIframeParentOrigins] = useState("");
  const [requireEmbedSignature, setRequireEmbedSignature] = useState(false);
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#f59e0b");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#fbbf24");
  const [signedEmbedPath, setSignedEmbedPath] = useState("");
  const [signedEmbedExpires, setSignedEmbedExpires] = useState("");
  const [isGeneratingSignedLink, setIsGeneratingSignedLink] = useState(false);
  const [pricingSheetFile, setPricingSheetFile] = useState<File | null>(null);
  const [isImportingSheet, setIsImportingSheet] = useState(false);
  const [importSummary, setImportSummary] = useState("");
  const [importError, setImportError] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importRowErrors, setImportRowErrors] = useState<ImportErrorRow[]>([]);
  const [changeMetadata, setChangeMetadata] = useState<PricingChangeMetadata>({ source: "manual" });

  useEffect(() => {
    if (!token) {
      setAuthError("No setup token found. Please use the link from your signup confirmation.");
      setIsLoading(false);
      return;
    }

    fetch(`/api/onboard/pricing?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(
        (data: {
          contractor?: ContractorInfo;
          pricing?: PricingRow[];
          settings?: EmbedSettings;
          error?: string;
        }) => {
        if (data.error) {
          setAuthError(data.error);
          return;
        }

        setContractor(data.contractor ?? null);

        if (data.pricing && data.pricing.length > 0) {
          // Merge loaded rows into defaults so all combos are present
          const merged = buildDefaultRows().map((def) => {
            const loaded = data.pricing!.find(
              (r) => r.fence_type === def.fence_type && r.fence_height === def.fence_height
            );
            return loaded ?? def;
          });
          setRows(merged);

          // Set globals from first row
          const first = data.pricing[0];
          setGatePrice(Number(first.gate_price));
          setTearOutFee(Number(first.tear_out_fee));
          setMinJobPrice(Number(first.minimum_job_price));
          setHighMultiplier(Number(first.estimate_high_multiplier));
          setGradeFlat(Number(first.grade_multiplier_flat));
          setGradeMod(Number(first.grade_multiplier_moderate));
          setGradeSteep(Number(first.grade_multiplier_steep));
        }

        if (data.settings) {
          setEmbedEnabled(data.settings.embed_enabled !== false);
          setIframeParentOrigins(data.settings.iframe_parent_origins ?? "");
          setRequireEmbedSignature(data.settings.require_embed_signature === true);
          setBrandPrimaryColor(data.settings.brand_primary_color || "#f59e0b");
          setBrandSecondaryColor(data.settings.brand_secondary_color || "#fbbf24");
        }
      })
      .catch(() => setAuthError("Failed to load pricing data."))
      .finally(() => setIsLoading(false));
  }, [token]);

  async function generateSignedEmbedLink() {
    setSaveError("");
    setIsGeneratingSignedLink(true);

    try {
      const res = await fetch(`/api/onboard/embed-link?token=${encodeURIComponent(token)}&days=30`);
      const data = (await res.json()) as {
        embedPath?: string;
        expiresAtIso?: string;
        error?: string;
      };

      if (!res.ok || data.error || !data.embedPath) {
        setSaveError(data.error ?? "Failed to generate signed embed link.");
        return;
      }

      setSignedEmbedPath(data.embedPath);
      setSignedEmbedExpires(data.expiresAtIso ?? "");
    } catch {
      setSaveError("Failed to generate signed embed link.");
    } finally {
      setIsGeneratingSignedLink(false);
    }
  }

  function updatePpf(fence_type: FenceType, fence_height: FenceHeight, value: number) {
    setChangeMetadata({ source: "manual" });
    setRows((prev) =>
      prev.map((r) =>
        r.fence_type === fence_type && r.fence_height === fence_height
          ? { ...r, price_per_foot: value }
          : r
      )
    );
  }

  function toggleActive(fence_type: FenceType, fence_height: FenceHeight) {
    setChangeMetadata({ source: "manual" });
    setRows((prev) =>
      prev.map((r) =>
        r.fence_type === fence_type && r.fence_height === fence_height
          ? { ...r, is_active: !r.is_active }
          : r
      )
    );
  }

  function applyImportedRows(importedRows: PricingRow[]) {
    const merged = buildDefaultRows().map((def) => {
      const imported = importedRows.find(
        (row) => row.fence_type === def.fence_type && row.fence_height === def.fence_height
      );
      return imported ?? def;
    });

    setRows(merged);

    if (importedRows.length > 0) {
      const first = importedRows[0];
      setGatePrice(Number(first.gate_price));
      setTearOutFee(Number(first.tear_out_fee));
      setMinJobPrice(Number(first.minimum_job_price));
      setHighMultiplier(Number(first.estimate_high_multiplier));
      setGradeFlat(Number(first.grade_multiplier_flat));
      setGradeMod(Number(first.grade_multiplier_moderate));
      setGradeSteep(Number(first.grade_multiplier_steep));
    }
  }

  async function handleImportPricingSheet() {
    if (!pricingSheetFile) {
      setImportError("Choose a CSV file before importing.");
      return;
    }

    setIsImportingSheet(true);
    setImportError("");
    setImportSummary("");
    setImportWarnings([]);
    setImportRowErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", pricingSheetFile);

      const res = await fetch(`/api/onboard/pricing/import?token=${encodeURIComponent(token)}`, {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as ImportResponse;

      if (!res.ok || !data.ok || !data.rows) {
        setImportError(data.error ?? "Import failed. Please check the file format.");
        setImportWarnings(data.warnings ?? []);
        setImportRowErrors(data.errors ?? []);
        return;
      }

      applyImportedRows(data.rows);
      setImportWarnings(data.warnings ?? []);
      setImportRowErrors([]);
      setImportSummary(
        `Imported ${data.rows.length} pricing rows from ${pricingSheetFile.name}. Click Save Pricing to persist changes.`
      );
      setChangeMetadata({ source: "csv-import", file_name: pricingSheetFile.name });
      setSaved(false);
    } catch {
      setImportError("Import failed. Please try again.");
    } finally {
      setIsImportingSheet(false);
    }
  }

  async function handleSave() {
    setSaveError("");
    setSaved(false);
    setIsSaving(true);

    const payload = {
      pricing: rows.map((r) => ({
        ...r,
        gate_price: gatePrice,
        tear_out_fee: tearOutFee,
        minimum_job_price: minJobPrice,
        estimate_high_multiplier: highMultiplier,
        grade_multiplier_flat: gradeFlat,
        grade_multiplier_moderate: gradeMod,
        grade_multiplier_steep: gradeSteep,
      })),
      settings: {
        embed_enabled: embedEnabled,
        iframe_parent_origins: iframeParentOrigins,
        require_embed_signature: requireEmbedSignature,
        brand_primary_color: brandPrimaryColor,
        brand_secondary_color: brandSecondaryColor,
      },
      metadata: changeMetadata,
    };

    try {
      const res = await fetch(`/api/onboard/pricing?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || data.error) {
        setSaveError(data.error ?? "Failed to save pricing.");
        return;
      }

      setSaved(true);
    } catch {
      setSaveError("Failed to save pricing.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDownloadTemplate() {
    const csv = buildPricingTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contractor-pricing-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <div className="mt-24 text-center text-slate-500">Loading your account...</div>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-lg text-center">
          <div className="glass-panel mt-24 rounded-[32px] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
              Access Denied
            </p>
            <p className="mt-4 text-slate-700">{authError}</p>
            <Link
              href="/onboard"
              className="mt-6 inline-block text-sm text-amber-300 hover:underline"
            >
              Start over &rarr;
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const embedUrl = contractor ? `/quote?contractor=${contractor.slug}` : "";

  return (
    <main className="min-h-screen px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl fade-in-up">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight">Pricing Setup</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Set your per-foot base price for each material and height combination. Uncheck any
            combinations you don&apos;t offer.
          </p>
          {contractor && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                {contractor.slug}
              </span>
              <span className="text-xs text-slate-500">
                Quote link:{" "}
                <span className="font-mono text-slate-900">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  {embedUrl}
                </span>
              </span>
            </div>
          )}
        </div>

        <section className="glass-panel mb-6 rounded-[32px] p-6 md:p-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Pricing Sheet Import
          </p>
          <p className="mb-4 text-xs text-slate-500">
            Upload a CSV with columns: fence_type, fence_height, price_per_foot. Optional columns:
            is_active, grade multipliers, gate_price, tear_out_fee, minimum_job_price,
            estimate_high_multiplier.
          </p>

          <div className="mb-4">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Download CSV Template
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                CSV File
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setPricingSheetFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
              />
            </div>

            <button
              type="button"
              onClick={handleImportPricingSheet}
              disabled={isImportingSheet || !pricingSheetFile}
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isImportingSheet ? "Importing..." : "Import CSV"}
            </button>
          </div>

          {importSummary ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {importSummary}
            </p>
          ) : null}

          {importError ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {importError}
            </p>
          ) : null}

          {importWarnings.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {importWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {importRowErrors.length > 0 ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <p className="font-semibold">Import validation errors</p>
              <div className="mt-1 space-y-1">
                {importRowErrors.slice(0, 8).map((rowError, idx) => (
                  <p key={`${rowError.row}-${rowError.field}-${idx}`}>
                    Row {rowError.row} ({rowError.field}): {rowError.message}
                  </p>
                ))}
                {importRowErrors.length > 8 ? (
                  <p>...and {importRowErrors.length - 8} more errors.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {/* Per-type price grid */}
        <section className="glass-panel rounded-[32px] p-6 md:p-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Price Per Linear Foot
          </p>
          <p className="mb-6 text-xs text-slate-500">
            Each cell is the base $/ft for that material + height. Uncheck to disable that option.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Material
                  </th>
                  {FENCE_HEIGHTS.map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                    >
                      {h} ft
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {FENCE_TYPES.map((fenceType) => (
                  <tr key={fenceType}>
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {FENCE_TYPE_LABELS[fenceType]}
                    </td>
                    {FENCE_HEIGHTS.map((fenceHeight) => {
                      const row = rows.find(
                        (r) => r.fence_type === fenceType && r.fence_height === fenceHeight
                      )!;
                      const key = rowKey(fenceType, fenceHeight);
                      return (
                        <td key={key} className="py-3 px-2">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={row.is_active ? "" : "opacity-40"}>
                              {numInput(row.price_per_foot, (v) => updatePpf(fenceType, fenceHeight, v), {
                                step: 0.5,
                                prefix: "$",
                              })}
                            </div>
                            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-500">
                              <input
                                type="checkbox"
                                checked={row.is_active}
                                onChange={() => toggleActive(fenceType, fenceHeight)}
                                className="h-3 w-3 accent-amber-400"
                              />
                              Active
                            </label>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Grade multipliers */}
        <section className="glass-panel mt-6 rounded-[32px] p-6 md:p-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Yard Grade Multipliers
          </p>
          <p className="mb-6 text-xs text-slate-500">
            Applied to base price. Flat = 1.0 means no adjustment.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {(
              [
                ["Flat", gradeFlat, setGradeFlat],
                ["Moderate Slope", gradeMod, setGradeMod],
                ["Steep Slope", gradeSteep, setGradeSteep],
              ] as [string, number, (v: number) => void][]
            ).map(([label, val, set]) => (
              <div key={label}>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {label}
                </label>
                {numInput(val, set, { step: 0.01, min: 0.5 })}
              </div>
            ))}
          </div>
        </section>

        {/* Fees & limits */}
        <section className="glass-panel mt-6 rounded-[32px] p-6 md:p-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Fees &amp; Estimate Settings
          </p>
          <p className="mb-6 text-xs text-slate-500">
            Applied uniformly across all fence types.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                ["Gate Price (per gate)", gatePrice, setGatePrice, "$"],
                ["Tear-Out &amp; Removal Fee", tearOutFee, setTearOutFee, "$"],
                ["Minimum Job Price", minJobPrice, setMinJobPrice, "$"],
                ["Estimate High Multiplier", highMultiplier, setHighMultiplier, "x"],
              ] as [string, number, (v: number) => void, string][]
            ).map(([label, val, set, prefix]) => (
              <div key={label}>
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
                  dangerouslySetInnerHTML={{ __html: label }}
                />
                {numInput(val, set, { step: prefix === "x" ? 0.01 : 50, prefix })}
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        <section className="glass-panel mt-6 rounded-[32px] p-6 md:p-8">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Embed Security & Branding
          </p>
          <p className="mb-6 text-xs text-slate-500">
            Control iframe access per tenant and keep embeds white-label.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={embedEnabled}
                onChange={(e) => setEmbedEnabled(e.target.checked)}
                className="h-4 w-4 accent-amber-400"
              />
              Embedding enabled
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={requireEmbedSignature}
                onChange={(e) => setRequireEmbedSignature(e.target.checked)}
                className="h-4 w-4 accent-amber-400"
              />
              Require signed embed URLs
            </label>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Allowed Parent Origins (comma-separated)
              </label>
              <textarea
                value={iframeParentOrigins}
                onChange={(e) => setIframeParentOrigins(e.target.value)}
                rows={3}
                placeholder="https://www.contractorsite.com, https://staging.contractorsite.com"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Primary Brand Color
              </label>
              <input
                value={brandPrimaryColor}
                onChange={(e) => setBrandPrimaryColor(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
                placeholder="#f59e0b"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Secondary Brand Color
              </label>
              <input
                value={brandSecondaryColor}
                onChange={(e) => setBrandSecondaryColor(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10"
                placeholder="#fbbf24"
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/10 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Signed URLs add exp + sig and can expire automatically.
              </p>
              <button
                type="button"
                onClick={generateSignedEmbedLink}
                disabled={isGeneratingSignedLink}
                className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingSignedLink ? "Generating..." : "Generate 30-day signed URL"}
              </button>
            </div>

            {signedEmbedPath ? (
              <div className="mt-3 text-xs text-slate-700">
                <p className="font-mono break-all text-slate-900">{signedEmbedPath}</p>
                {signedEmbedExpires ? (
                  <p className="mt-1 text-slate-500">Expires: {signedEmbedExpires}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_4px_20px_rgba(245,158,11,0.28)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4a10 10 0 00-10 10h4z" />
              </svg>
            )}
            {isSaving ? "Saving..." : "Save Pricing"}
          </button>

          {saved && (
            <div className="text-sm text-emerald-300">
              Saved! Your quote form is live at{" "}
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-900"
              >
                {embedUrl}
              </a>
            </div>
          )}

          {saveError && <p className="text-sm text-rose-300">{saveError}</p>}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Bookmark this page to return and update your pricing at any time. The URL contains your
          unique setup token.
        </p>
      </div>
    </main>
  );
}

export default function OnboardSetupPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen px-4 py-12 text-slate-900">
          <div className="mx-auto mt-24 max-w-3xl text-center text-slate-500">Loading setup...</div>
        </main>
      }
    >
      <OnboardSetupPageContent />
    </Suspense>
  );
}


