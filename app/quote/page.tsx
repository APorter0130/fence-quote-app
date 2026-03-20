"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import FenceDrawMap from "../../components/fence-draw-map";
import {
  calculateQuoteFromPricing,
  getContractorPricing,
  getContractorPricingOptions,
  type ContractorPricingOption,
  type ContractorPricingRow,
} from "../../lib/pricing";
import { contractors, type Contractor } from "../../data/contractors";
import { resolveContractor } from "../../lib/contractors";
import { supabase } from "../../lib/supabase";
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

export default function QuotePage() {
  const searchParams = useSearchParams();
  const contractorParam = searchParams.get("contractor")?.trim() ?? "";

  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(
    contractors[0]
  );
  const [isContractorLoading, setIsContractorLoading] = useState(false);
  const [contractorError, setContractorError] = useState("");
  const [selectedPricing, setSelectedPricing] = useState<ContractorPricingRow | null>(null);
  const [availablePricingOptions, setAvailablePricingOptions] = useState<ContractorPricingOption[]>([]);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState("");

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

  const fullAddress = [streetAddress, city, state, zip]
    .filter(Boolean)
    .join(", ");

  const canSearch =
    streetAddress.trim().length > 3 &&
    city.trim().length > 1 &&
    state.trim().length === 2 &&
    zip.trim().length === 5;

  useEffect(() => {
    let isCancelled = false;

    async function loadContractor() {
      if (!contractorParam) {
        setSelectedContractor(contractors[0]);
        setContractorError("");
        setIsContractorLoading(false);
        return;
      }

      setIsContractorLoading(true);
      setContractorError("");

      try {
        const contractor = await resolveContractor(contractorParam);

        if (isCancelled) {
          return;
        }

        if (!contractor) {
          setSelectedContractor(null);
          setContractorError("Invalid contractor configuration. Please use a valid quote link.");
          return;
        }

        setSelectedContractor(contractor);
      } catch {
        if (isCancelled) {
          return;
        }

        setSelectedContractor(null);
        setContractorError("Unable to load contractor configuration right now. Please try again.");
      } finally {
        if (!isCancelled) {
          setIsContractorLoading(false);
        }
      }
    }

    loadContractor();

    return () => {
      isCancelled = true;
    };
  }, [contractorParam]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPricingOptions() {
      if (!selectedContractor) {
        setAvailablePricingOptions([]);
        return;
      }

      try {
        const pricingOptions = await getContractorPricingOptions(selectedContractor.id);

        if (isCancelled) {
          return;
        }

        setAvailablePricingOptions(pricingOptions);

        if (pricingOptions.length === 0) {
          return;
        }

        const hasCurrentSelection = pricingOptions.some(
          (option) => option.fence_type === fenceType && option.fence_height === fenceHeight
        );

        if (hasCurrentSelection) {
          return;
        }

        const matchingTypeOption = pricingOptions.find(
          (option) => option.fence_type === fenceType
        );

        if (matchingTypeOption) {
          setFenceHeight(matchingTypeOption.fence_height);
          return;
        }

        setFenceType(pricingOptions[0].fence_type);
        setFenceHeight(pricingOptions[0].fence_height);
      } catch {
        if (isCancelled) {
          return;
        }

        setAvailablePricingOptions([]);
      }
    }

    loadPricingOptions();

    return () => {
      isCancelled = true;
    };
  }, [selectedContractor, fenceHeight, fenceType]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPricing() {
      if (!selectedContractor) {
        setSelectedPricing(null);
        setPricingError("");
        setIsPricingLoading(false);
        return;
      }

      setIsPricingLoading(true);
      setSelectedPricing(null);
      setPricingError("");

      try {
        const pricing = await getContractorPricing(
          selectedContractor.id,
          fenceType,
          fenceHeight
        );

        if (isCancelled) {
          return;
        }

        setSelectedPricing(pricing);
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        setSelectedPricing(null);
        setPricingError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load contractor pricing."
        );
      } finally {
        if (!isCancelled) {
          setIsPricingLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      isCancelled = true;
    };
  }, [selectedContractor, fenceType, fenceHeight]);

  const estimate = useMemo(() => {
    if (!selectedPricing) {
      return null;
    }

    if (!linearFeet || linearFeet <= 0) {
      return null;
    }

    return calculateQuoteFromPricing(selectedPricing, {
      linearFeet,
      gates,
      yardGrade,
      tearOut,
    });
  }, [gates, linearFeet, selectedPricing, tearOut, yardGrade]);

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

    const nextErrors = validateFields();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const name = customerName;
      const email = customerEmail;
      const phone = customerPhone;
      const estimateTotal = estimate.lowEstimate;

      const payload = {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        address: fullAddress,
        street_address: streetAddress,
        city,
        state,
        zip,
        fence_type: fenceType,
        fence_height: fenceHeight,
        yard_grade: yardGrade,
        linear_feet: linearFeet,
        gates,
        tear_out: tearOut ?? false,
        contractor_id: selectedContractor.id,
        contractor_name: selectedContractor.name,
        estimate_low: estimate.lowEstimate,
        estimate_high: estimate.highEstimate,
        estimate_subtotal: estimate.subtotal,
        estimate_total: estimateTotal,
        status: "new",
        // optional compatibility fields if you want to keep them too
        name,
        email,
        phone,
      };

      const { data, error: insertError } = await supabase
        .from("quote_submissions")
        .insert(payload)
        .select();

      console.log("Submitting payload:", payload);
      console.log("Supabase insert data:", data);
      console.log(
        "Supabase insert error full:",
        JSON.stringify(insertError, null, 2)
      );

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
      <main className="min-h-screen px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl fade-in-up">
          <section className="glass-panel overflow-hidden rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 bg-gradient-to-r from-emerald-300/15 via-transparent to-transparent px-6 py-6 md:px-10">
              <div className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                Estimate Ready
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Your preliminary range is unlocked
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Thanks, {customerName}. Your request is in the contractor dashboard,
                and your current projected range is below.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">
                Routed to {selectedContractor.name}
              </p>
            </div>

            <div className="px-6 py-8 md:px-10">
              <div className="rounded-[26px] border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.03] to-transparent p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
                  Estimated Range
                </p>
                <p className="mt-4">
                  <span className="inline-flex rounded-2xl border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-4xl font-extrabold tracking-tight leading-none text-white drop-shadow-[0_8px_24px_rgba(245,158,11,0.32)] md:text-6xl">
                    ${estimate.lowEstimate.toLocaleString()} - ${estimate.highEstimate.toLocaleString()}
                  </span>
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  This estimate is based on your selections and measured fence footage.
                </p>
                <p className="mt-4 text-xs leading-5 text-slate-400">
                  Final pricing may vary based on layout, site access, removal needs, and other field conditions.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSubmitted(false)}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                >
                  Edit Submission
                </button>
                <span className="text-sm text-slate-400">
                  {selectedContractor.name} can now review your details and contact you.
                </span>
              </div>
            </div>
          </section>
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

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Fence Type</label>
                  <select
                    value={fenceType}
                    onChange={(e) => setFenceType(e.target.value as FenceType)}
                    className={selectClass()}
                  >
                    <option value="cedar" className="bg-slate-900" disabled={!availableFenceTypes.has("cedar")}>Cedar Privacy</option>
                    <option value="vinyl" className="bg-slate-900" disabled={!availableFenceTypes.has("vinyl")}>Vinyl Privacy</option>
                    <option value="chain-link" className="bg-slate-900" disabled={!availableFenceTypes.has("chain-link")}>Chain Link</option>
                    <option value="aluminum" className="bg-slate-900" disabled={!availableFenceTypes.has("aluminum")}>Aluminum</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Fence Height</label>
                  <select
                    value={fenceHeight}
                    onChange={(e) => setFenceHeight(e.target.value as FenceHeight)}
                    className={selectClass()}
                  >
                    <option value="4" className="bg-slate-900" disabled={!availableHeightsForFenceType.has("4")}>4 ft</option>
                    <option value="6" className="bg-slate-900" disabled={!availableHeightsForFenceType.has("6")}>6 ft</option>
                    <option value="8" className="bg-slate-900" disabled={!availableHeightsForFenceType.has("8")}>8 ft</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Yard Grade</label>
                  <select
                    value={yardGrade}
                    onChange={(e) => setYardGrade(e.target.value as YardGrade)}
                    className={selectClass()}
                  >
                    <option value="flat" className="bg-slate-900">Flat</option>
                    <option value="moderate" className="bg-slate-900">Moderate Slope</option>
                    <option value="steep" className="bg-slate-900">Steep Slope</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Linear Feet</label>
                  <input
                    type="number"
                    value={linearFeet}
                    onChange={(e) => {
                      setLinearFeet(Number(e.target.value));
                      clearFieldError("linearFeet");
                    }}
                    className={inputClass("linearFeet", linearFeet > 0)}
                  />
                  {fieldErrors.linearFeet ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.linearFeet}</p> : null}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Number of Gates</label>
                  <input
                    type="number"
                    value={gates}
                    onChange={(e) => {
                      setGates(Number(e.target.value));
                      clearFieldError("gates");
                    }}
                    className={inputClass("gates", gates >= 0)}
                  />
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
                    disabled={isSubmitting || isPricingLoading || !estimate}
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























