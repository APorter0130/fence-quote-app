"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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

function numInput(
  value: number,
  onChange: (v: number) => void,
  opts?: { step?: number; min?: number; prefix?: string }
) {
  return (
    <div className="relative">
      {opts?.prefix && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {opts.prefix}
        </span>
      )}
      <input
        type="number"
        value={value}
        step={opts?.step ?? 1}
        min={opts?.min ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full rounded-xl border border-white/10 bg-white/[0.05] py-2 text-right text-sm text-white outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/10 ${opts?.prefix ? "pl-6 pr-3" : "px-3"}`}
      />
    </div>
  );
}

export default function OnboardSetupPage() {
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

  useEffect(() => {
    if (!token) {
      setAuthError("No setup token found. Please use the link from your signup confirmation.");
      setIsLoading(false);
      return;
    }

    fetch(`/api/onboard/pricing?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: { contractor?: ContractorInfo; pricing?: PricingRow[]; error?: string }) => {
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
      })
      .catch(() => setAuthError("Failed to load pricing data."))
      .finally(() => setIsLoading(false));
  }, [token]);

  function updatePpf(fence_type: FenceType, fence_height: FenceHeight, value: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.fence_type === fence_type && r.fence_height === fence_height
          ? { ...r, price_per_foot: value }
          : r
      )
    );
  }

  function toggleActive(fence_type: FenceType, fence_height: FenceHeight) {
    setRows((prev) =>
      prev.map((r) =>
        r.fence_type === fence_type && r.fence_height === fence_height
          ? { ...r, is_active: !r.is_active }
          : r
      )
    );
  }

  async function handleSave() {
    setSaveError("");
    setSaved(false);
    setIsSaving(true);

    const payload = rows.map((r) => ({
      ...r,
      gate_price: gatePrice,
      tear_out_fee: tearOutFee,
      minimum_job_price: minJobPrice,
      estimate_high_multiplier: highMultiplier,
      grade_multiplier_flat: gradeFlat,
      grade_multiplier_moderate: gradeMod,
      grade_multiplier_steep: gradeSteep,
    }));

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

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="mt-24 text-center text-slate-400">Loading your account…</div>
        </div>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="min-h-screen px-4 py-12 text-white">
        <div className="mx-auto max-w-lg text-center">
          <div className="glass-panel mt-24 rounded-[32px] p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
              Access Denied
            </p>
            <p className="mt-4 text-slate-300">{authError}</p>
            <Link
              href="/onboard"
              className="mt-6 inline-block text-sm text-amber-300 hover:underline"
            >
              Start over →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const embedUrl = contractor ? `/quote?contractor=${contractor.slug}` : "";

  return (
    <main className="min-h-screen px-4 py-12 text-white">
      <div className="mx-auto max-w-4xl fade-in-up">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight">Pricing Setup</h1>
          <p className="mt-3 text-base leading-7 text-slate-300">
            Set your per-foot base price for each material and height combination. Uncheck any
            combinations you don&apos;t offer.
          </p>
          {contractor && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                {contractor.slug}
              </span>
              <span className="text-xs text-slate-400">
                Quote link:{" "}
                <span className="font-mono text-white">
                  {typeof window !== "undefined" ? window.location.origin : ""}
                  {embedUrl}
                </span>
              </span>
            </div>
          )}
        </div>

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
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Material
                  </th>
                  {FENCE_HEIGHTS.map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                    >
                      {h} ft
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {FENCE_TYPES.map((fenceType) => (
                  <tr key={fenceType}>
                    <td className="py-3 pr-4 font-medium text-white">
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
                            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-400">
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
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
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
                ["Estimate High Multiplier", highMultiplier, setHighMultiplier, "×"],
              ] as [string, number, (v: number) => void, string][]
            ).map(([label, val, set, prefix]) => (
              <div key={label}>
                <label
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
                  dangerouslySetInnerHTML={{ __html: label }}
                />
                {numInput(val, set, { step: prefix === "×" ? 0.01 : 50, prefix })}
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
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
            {isSaving ? "Saving…" : "Save Pricing"}
          </button>

          {saved && (
            <div className="text-sm text-emerald-300">
              ✓ Saved! Your quote form is live at{" "}
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
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
