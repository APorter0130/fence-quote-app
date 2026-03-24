"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FenceDrawMap from "../../components/fence-draw-map";
import {
  calculateQuoteFromPricing,
  createUnavailableEstimate,
} from "../../lib/pricing";
import { buildQuotePayload } from "../../lib/quote-payload";
import { supabase } from "../../lib/supabase";
import { useContractorConfig } from "../../lib/use-contractor-config";
import {
  FENCE_HEIGHTS,
  FENCE_TYPES,
  YARD_GRADES,
} from "../../types/quote";
import type {
  FenceHeight,
  FenceType,
  YardGrade,
} from "../../types/quote";

type FieldKey =
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "streetAddress"
  | "city"
  | "state"
  | "zip"
  | "linearFeet"
  | "gates";

const FENCE_TYPE_META: Record<FenceType, { label: string; desc: string }> = {
  cedar: { label: "Cedar", desc: "Natural wood" },
  vinyl: { label: "Vinyl", desc: "Low maintenance" },
  "chain-link": { label: "Chain Link", desc: "Open & durable" },
  aluminum: { label: "Aluminum", desc: "Premium metal" },
};

function CedarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3L7.5 10h3V14L5.5 18v2h13v-2L14 14V10h3L12 3z" />
    </svg>
  );
}

function VinylIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="4" rx="1" />
      <rect x="2" y="10" width="20" height="4" rx="1" />
      <rect x="2" y="16" width="20" height="4" rx="1" />
    </svg>
  );
}

function ChainLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 4L8 12L12 4L16 12L20 4" />
      <path d="M4 12L8 20L12 12L16 20L20 12" />
    </svg>
  );
}

function AluminumIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="14" x2="21" y2="14" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <line x1="7" y1="3" x2="7" y2="21" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="17" y1="3" x2="17" y2="21" />
    </svg>
  );
}

const FENCE_ICONS: Record<FenceType, React.ComponentType<{ className?: string }>> = {
  cedar: CedarIcon,
  vinyl: VinylIcon,
  "chain-link": ChainLinkIcon,
  aluminum: AluminumIcon,
};

export default function QuotePage() {
  const searchParams = useSearchParams();
  const contractorParam = searchParams.get("contractor")?.trim() ?? "";

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [fenceType, setFenceType] = useState<FenceType>("cedar");
  const [fenceHeight, setFenceHeight] = useState<FenceHeight>("6");
  const [yardGrade, setYardGrade] = useState<YardGrade>("flat");
  const [linearFeet, setLinearFeet] = useState(100);
  const [gates, setGates] = useState(1);
  const [tearOut, setTearOut] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const {
    contractor: selectedContractor,
    pricing: selectedPricing,
    pricingOptions: availablePricingOptions,
    isLoading: isContractorConfigLoading,
    error: contractorConfigError,
  } = useContractorConfig(contractorParam, fenceType, fenceHeight);

  const fullAddress = [streetAddress, city, state, zip]
    .filter(Boolean)
    .join(", ");

  const canSearch =
    streetAddress.trim().length > 3 &&
    city.trim().length > 1 &&
    state.trim().length === 2 &&
    zip.trim().length === 5;

  useEffect(() => {
    if (availablePricingOptions.length === 0) {
      return;
    }

    const hasCurrentSelection = availablePricingOptions.some(
      (option) => option.fence_type === fenceType && option.fence_height === fenceHeight
    );

    if (hasCurrentSelection) {
      return;
    }

    const matchingTypeOption = availablePricingOptions.find(
      (option) => option.fence_type === fenceType
    );

    if (matchingTypeOption) {
      setFenceHeight(matchingTypeOption.fence_height);
      return;
    }

    setFenceType(availablePricingOptions[0].fence_type);
    setFenceHeight(availablePricingOptions[0].fence_height);
  }, [availablePricingOptions, fenceHeight, fenceType]);

  const estimate = useMemo(() => {
    if (!selectedPricing || !linearFeet || linearFeet <= 0) {
      if (isContractorConfigLoading) {
        return null;
      }

      if (!linearFeet || linearFeet <= 0) {
        return null;
      }

      return createUnavailableEstimate();
    }

    return calculateQuoteFromPricing(selectedPricing, {
      linearFeet,
      gates,
      yardGrade,
      tearOut,
    });
  }, [
    gates,
    isContractorConfigLoading,
    linearFeet,
    selectedPricing,
    tearOut,
    yardGrade,
  ]);

  const pricingError = selectedContractor ? contractorConfigError : "";
  const contractorError = !selectedContractor ? contractorConfigError : "";
  const isContractorLoading = isContractorConfigLoading;
  const isPricingLoading = isContractorConfigLoading;

  const availableFenceTypes = useMemo(() => {
    return new Set(availablePricingOptions.map((option) => option.fence_type));
  }, [availablePricingOptions]);

  const availableHeightsForFenceType = useMemo(() => {
    return new Set(
      availablePricingOptions
        .filter((option) => option.fence_type === fenceType)
        .map((option) => option.fence_height)
    );
  }, [availablePricingOptions, fenceType]);

  function validateFields() {
    const nextErrors: Partial<Record<FieldKey, string>> = {};

    if (!customerName.trim()) {
      nextErrors.customerName = "Please enter your full name.";
    }

    if (!customerEmail.trim()) {
      nextErrors.customerEmail = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      nextErrors.customerEmail = "Please enter a valid email address.";
    }

    if (!customerPhone.trim()) {
      nextErrors.customerPhone = "Please enter your phone number.";
    }

    if (!streetAddress.trim()) {
      nextErrors.streetAddress = "Please enter the street address.";
    }

    if (!city.trim()) {
      nextErrors.city = "Please enter the city.";
    }

    if (!state.trim()) {
      nextErrors.state = "Please enter the state.";
    }

    if (!zip.trim()) {
      nextErrors.zip = "Please enter the ZIP code.";
    }

    if (linearFeet <= 0) {
      nextErrors.linearFeet = "Linear feet must be greater than 0.";
    }

    if (gates < 0) {
      nextErrors.gates = "Number of gates cannot be negative.";
    }

    return nextErrors;
  }

  function clearFieldError(field: FieldKey) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }

  function inputClass(field: FieldKey, hasValue: boolean) {
    if (fieldErrors[field]) {
      return "w-full rounded-2xl border border-rose-400/65 bg-white/[0.06] px-4 py-3.5 text-[15px] text-white placeholder:text-slate-400 outline-none transition duration-200 focus:border-rose-300 focus:ring-4 focus:ring-rose-400/10";
    }

    if (hasValue) {
      return "w-full rounded-2xl border border-emerald-300/45 bg-white/[0.06] px-4 py-3.5 text-[15px] text-white placeholder:text-slate-400 outline-none transition duration-200 focus:border-amber-300 focus:ring-4 focus:ring-amber-400/10";
    }

    return "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white placeholder:text-slate-400 outline-none transition duration-200 focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10";
  }

  function selectClass() {
    return "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white outline-none transition duration-200 focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10";
  }

  function formatFenceType(value: FenceType) {
    if (value === "chain-link") {
      return "Chain Link";
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatYardGrade(value: YardGrade) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (isContractorLoading) {
      setError("Contractor settings are still loading. Please wait a moment and try again.");
      return;
    }

    if (isPricingLoading) {
      setError("Pricing is still loading. Please wait a moment and try again.");
      return;
    }

    if (!selectedContractor || !estimate) {
      setError(
        contractorError ||
        pricingError ||
        "Invalid contractor configuration. Please use a valid quote link."
      );
      return;
    }

    if (estimate.unavailable) {
      setError("Estimate unavailable for this selection.");
      return;
    }

    const nextErrors = validateFields();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = buildQuotePayload({
        customerName,
        customerEmail,
        customerPhone,
        fullAddress,
        streetAddress,
        city,
        state,
        zip,
        fenceType,
        fenceHeight,
        yardGrade,
        linearFeet,
        gates,
        tearOut,
        contractor: selectedContractor,
        estimate,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("QUOTE SUBMIT:", payload);
        console.log("ESTIMATE:", estimate);
      }

      const { error: insertError } = await supabase
        .from("quote_submissions")
        .insert(payload)
        .select();

      if (insertError) {
        setError(
          insertError.message ||
          insertError.details ||
          insertError.hint ||
          "Something went wrong saving your quote."
        );
        return;
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong saving your quote."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isContractorLoading) {
    return (
      <main className="min-h-screen px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl fade-in-up">
          <section className="glass-panel overflow-hidden rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-amber-300/15 via-transparent to-transparent px-6 py-6 md:px-10">
              <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                Loading
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Loading contractor configuration
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                This quote form is resolving the contractor tied to your embed link.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!selectedContractor) {
    return (
      <main className="min-h-screen px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl fade-in-up">
          <section className="glass-panel overflow-hidden rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-rose-300/15 via-transparent to-transparent px-6 py-6 md:px-10">
              <div className="inline-flex rounded-full border border-rose-300/40 bg-rose-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">
                Invalid Quote Link
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                This contractor link could not be resolved
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Use a valid contractor identifier in the quote URL, for example
                <span className="font-medium text-white"> ?contractor=aj-fence</span>
                or the contractor UUID.
              </p>
            </div>

            <div className="px-6 py-8 md:px-10 text-sm leading-7 text-slate-300">
              <p>
                {contractorError || "The form is intentionally blocked here so submissions are not attached to the wrong contractor."}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (submitted && estimate) {
    return (
      <main className="min-h-screen px-4 py-12 text-white">
        <div className="mx-auto max-w-3xl fade-in-up">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Estimate Ready
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
              Your range is unlocked
            </h1>
            <p className="mt-3 text-base text-slate-400">
              Thanks, <span className="font-semibold text-white">{customerName}</span>. Routed to{" "}
              <span className="font-semibold text-amber-300">{selectedContractor.name}</span>.
            </p>
          </div>

          {/* Price reveal card */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-400/10 via-amber-400/5 to-transparent p-8 shadow-[0_0_60px_rgba(251,191,36,0.08)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.1),transparent_65%)]" />

            <p className="relative text-center text-[11px] font-bold uppercase tracking-[0.22em] text-amber-400/70">
              Estimated Range
            </p>

            <div className="relative mt-6 flex items-end justify-center gap-4 md:gap-8">
              <div className="text-center">
                <p className="text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(251,191,36,0.25)] md:text-6xl">
                  ${estimate.lowEstimate.toLocaleString()}
                </p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Low</p>
              </div>
              <div className="mb-6 h-px w-10 bg-gradient-to-r from-amber-400/50 to-amber-400/50 md:w-16" />
              <div className="text-center">
                <p className="text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_24px_rgba(251,191,36,0.25)] md:text-6xl">
                  ${estimate.highEstimate.toLocaleString()}
                </p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">High</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="relative mt-8 space-y-2 border-t border-white/10 pt-6 text-sm">
              {estimate.baseTotal > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Base installation</span>
                  <span className="text-slate-300">${estimate.baseTotal.toLocaleString()}</span>
                </div>
              )}
              {estimate.gateTotal > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Gates ({gates})</span>
                  <span className="text-slate-300">${estimate.gateTotal.toLocaleString()}</span>
                </div>
              )}
              {estimate.tearOutTotal > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tear-out &amp; removal</span>
                  <span className="text-slate-300">${estimate.tearOutTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
                <span>Subtotal</span>
                <span>${estimate.subtotal.toLocaleString()}</span>
              </div>
            </div>

            <p className="relative mt-5 text-center text-xs text-slate-500">
              Final pricing may vary based on layout, site access, removal needs, and other field conditions.
            </p>
          </div>

          {/* Summary + Next steps */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Project Summary</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fence type</span>
                  <span className="font-medium text-white">{FENCE_TYPE_META[fenceType].label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Height</span>
                  <span className="font-medium text-white">{fenceHeight} ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Linear feet</span>
                  <span className="font-medium text-white">{linearFeet} ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gates</span>
                  <span className="font-medium text-white">{gates}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Yard grade</span>
                  <span className="font-medium text-white">{formatYardGrade(yardGrade)}</span>
                </div>
                {tearOut && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tear-out</span>
                    <span className="font-medium text-white">Included</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">What Happens Next</p>
              <ol className="mt-4 space-y-3">
                {[
                  "Your request is saved to the contractor dashboard.",
                  "A contractor reviews scope and site details.",
                  "You receive final follow-up for verified pricing.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-300">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-[10px] font-bold text-amber-400">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Footer action */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setSubmitted(false)}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
            >
              Edit Submission
            </button>
            <p className="text-sm text-slate-500">
              {selectedContractor.name} can now review your details and reach out.
            </p>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl fade-in-up">
        <header className="mb-8">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
            Instant Fence Estimator
          </div>

          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">
            Request Your Fence Estimate
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
            Share your project details and unlock a preliminary pricing range the moment
            you submit.
          </p>

          <p className="mt-4 text-sm font-medium text-amber-200/90">
            Pricing for {selectedContractor.name}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5 md:gap-3 text-xs text-slate-300">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              No obligation
            </span>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              Saved to contractor dashboard
            </span>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              Usually reviewed within 1 business day
            </span>
          </div>
        </header>

        <section className="glass-panel rounded-[32px] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={handleSubmit}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Project Details
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
                  Tell us about your project
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  Fill out all fields below to generate your estimate and submit your request.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Full Name</label>
                  <input
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      clearFieldError("customerName");
                    }}
                    className={inputClass("customerName", customerName.trim().length > 0)}
                    placeholder="John Smith"
                  />
                  {fieldErrors.customerName ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.customerName}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      clearFieldError("customerEmail");
                    }}
                    className={inputClass("customerEmail", customerEmail.trim().length > 0)}
                    placeholder="john@email.com"
                  />
                  {fieldErrors.customerEmail ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.customerEmail}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      clearFieldError("customerPhone");
                    }}
                    className={inputClass("customerPhone", customerPhone.trim().length > 0)}
                    placeholder="(555) 555-5555"
                  />
                  {fieldErrors.customerPhone ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.customerPhone}</p> : null}
                </div>

                <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-white">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => {
                        setStreetAddress(e.target.value);
                        clearFieldError("streetAddress");
                      }}
                      placeholder="123 Main St"
                      className={inputClass("streetAddress", streetAddress.trim().length > 0)}
                    />
                    {fieldErrors.streetAddress ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.streetAddress}</p> : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        clearFieldError("city");
                      }}
                      placeholder="Chesterfield"
                      className={inputClass("city", city.trim().length > 0)}
                    />
                    {fieldErrors.city ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.city}</p> : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value.toUpperCase().slice(0, 2));
                        clearFieldError("state");
                      }}
                      placeholder="MO"
                      className={inputClass("state", state.trim().length > 0)}
                      maxLength={2}
                    />
                    {fieldErrors.state ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.state}</p> : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">ZIP Code</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => {
                        setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                        clearFieldError("zip");
                      }}
                      placeholder="63017"
                      className={inputClass("zip", zip.trim().length > 0)}
                      inputMode="numeric"
                    />
                    {fieldErrors.zip ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.zip}</p> : null}
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={!canSearch}
                      onClick={() => setSearchTrigger((prev) => prev + 1)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Find Address
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowMap((prev) => !prev)}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    {showMap ? "Hide Map" : "Measure Fence on Map"}
                  </button>
                </div>

                {showMap && (
                  <div className="md:col-span-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                      <FenceDrawMap
                        address={fullAddress}
                        searchTrigger={searchTrigger}
                        onDistanceChange={(feet) => {
                          setLinearFeet(feet);
                        }}
                      />
                  </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Fence Type</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {FENCE_TYPES.map((type) => {
                      const Icon = FENCE_ICONS[type];
                      const isSelected = fenceType === type;
                      const isAvailable = availableFenceTypes.has(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setFenceType(type as FenceType)}
                          className={[
                            "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all duration-200",
                            isSelected
                              ? "border-amber-400/60 bg-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,0.12)] text-white"
                              : isAvailable
                                ? "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                                : "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600 opacity-40",
                          ].join(" ")}
                        >
                          <Icon className={`h-7 w-7 ${isSelected ? "text-amber-400" : ""}`} />
                          <span className="text-sm font-semibold">{FENCE_TYPE_META[type].label}</span>
                          <span className="text-[11px] opacity-60">{FENCE_TYPE_META[type].desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Fence Height</label>
                  <div className="flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                    {FENCE_HEIGHTS.map((height) => {
                      const isSelected = fenceHeight === height;
                      const isAvailable = availableHeightsForFenceType.has(height);
                      return (
                        <button
                          key={height}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setFenceHeight(height as FenceHeight)}
                          className={[
                            "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200",
                            isSelected
                              ? "bg-amber-400 text-slate-950 shadow-sm"
                              : isAvailable
                                ? "text-slate-400 hover:text-white"
                                : "cursor-not-allowed text-slate-600 opacity-40",
                          ].join(" ")}
                        >
                          {height} ft
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Yard Grade</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(YARD_GRADES as readonly YardGrade[]).map((grade) => {
                      const isSelected = yardGrade === grade;
                      const symbol = grade === "flat" ? "━━" : grade === "moderate" ? "╱━" : "╱╱";
                      const desc = grade === "flat" ? "Level terrain" : grade === "moderate" ? "Gentle slope" : "Steep grade";
                      const label = grade === "moderate" ? "Moderate" : formatYardGrade(grade);
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => setYardGrade(grade)}
                          className={[
                            "flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-center transition-all duration-200",
                            isSelected
                              ? "border-amber-400/60 bg-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,0.12)] text-white"
                              : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
                          ].join(" ")}
                        >
                          <span className={`font-mono text-base tracking-widest ${isSelected ? "text-amber-400" : ""}`}>{symbol}</span>
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-[11px] opacity-60">{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Linear Feet</label>
                  <div className={`flex overflow-hidden rounded-2xl border ${fieldErrors.linearFeet ? "border-rose-400/65" : "border-white/10"} bg-white/[0.04]`}>
                    <button
                      type="button"
                      onClick={() => { setLinearFeet(Math.max(1, linearFeet - 10)); clearFieldError("linearFeet"); }}
                      className="flex w-12 items-center justify-center text-xl font-light text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={linearFeet}
                      onChange={(e) => { setLinearFeet(Number(e.target.value)); clearFieldError("linearFeet"); }}
                      className="w-full bg-transparent py-3.5 text-center text-xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => { setLinearFeet(linearFeet + 10); clearFieldError("linearFeet"); }}
                      className="flex w-12 items-center justify-center text-xl font-light text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      +
                    </button>
                  </div>
                  {fieldErrors.linearFeet ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.linearFeet}</p> : null}
                </div>

                <div>
                  <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Number of Gates</label>
                  <div className={`flex overflow-hidden rounded-2xl border ${fieldErrors.gates ? "border-rose-400/65" : "border-white/10"} bg-white/[0.04]`}>
                    <button
                      type="button"
                      onClick={() => { setGates(Math.max(0, gates - 1)); clearFieldError("gates"); }}
                      className="flex w-12 items-center justify-center text-xl font-light text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={gates}
                      onChange={(e) => { setGates(Number(e.target.value)); clearFieldError("gates"); }}
                      className="w-full bg-transparent py-3.5 text-center text-xl font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => { setGates(gates + 1); clearFieldError("gates"); }}
                      className="flex w-12 items-center justify-center text-xl font-light text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      +
                    </button>
                  </div>
                  {fieldErrors.gates ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.gates}</p> : null}
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={tearOut}
                      onChange={(e) => setTearOut(e.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                    Include tear-out and removal of any existing fence
                  </label>
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}

              {!error && pricingError ? (
                <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  {pricingError}
                </div>
              ) : null}

              <div className="sticky bottom-3 mt-8 rounded-2xl border border-white/10 bg-slate-950/65 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting || isPricingLoading || !estimate || estimate.unavailable}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : isPricingLoading
                        ? "Loading Pricing..."
                        : "Get My Estimate"}
                  </button>

                  <p className="text-sm text-slate-300">
                    Your range appears immediately after successful submission.
                  </p>
                </div>
              </div>
            </form>

            <aside className="space-y-5">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Current Inputs
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p>Type: <span className="font-medium text-white">{formatFenceType(fenceType)}</span></p>
                  <p>Height: <span className="font-medium text-white">{fenceHeight} ft</span></p>
                  <p>Yard Grade: <span className="font-medium text-white">{formatYardGrade(yardGrade)}</span></p>
                  <p>Linear Feet: <span className="font-medium text-white">{linearFeet}</span></p>
                  <p>Gates: <span className="font-medium text-white">{gates}</span></p>
                  <p>Tear-out: <span className="font-medium text-white">{tearOut ? "Yes" : "No"}</span></p>
                </div>
              </div>


              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  What Happens Next
                </p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-300">
                  <li>Your request is saved to the contractor dashboard.</li>
                  <li>A contractor reviews scope and site details.</li>
                  <li>You receive final follow-up for verified pricing.</li>
                </ol>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}























