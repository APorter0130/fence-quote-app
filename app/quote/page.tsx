"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FenceDrawMap from "../../components/fence-draw-map";
import {
  calculateQuoteFromPricing,
  createUnavailableEstimate,
} from "../../lib/pricing";
import { buildQuotePayload } from "../../lib/quote-payload";
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

function QuotePageContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contractorParam = searchParams.get("contractor")?.trim() ?? "";
  const embedParam = searchParams.get("embed")?.trim().toLowerCase() ?? "";
  const embedSigParam = searchParams.get("sig")?.trim() ?? "";
  const embedExpParam = searchParams.get("exp")?.trim() ?? "";
  const utmSource = searchParams.get("utm_source")?.trim() ?? "";
  const leadSource = utmSource || contractorParam || null;

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
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isEmbedAccessLoading, setIsEmbedAccessLoading] = useState(false);
  const [embedAccessError, setEmbedAccessError] = useState("");
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState("");
  const [tenantSecondaryColor, setTenantSecondaryColor] = useState("");
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

  const isEmbedRoute = pathname.startsWith("/embed/");
  const isEmbedQueryMode = embedParam === "1" || embedParam === "true" || embedParam === "yes";
  const isEmbedMode = isEmbedded || isEmbedRoute || isEmbedQueryMode;

  const pageMainClassName = isEmbedMode
    ? "px-3 py-4 text-white sm:px-4 sm:py-6"
    : "min-h-screen px-4 py-10 text-white";

  const pageShellClassName = isEmbedMode ? "mx-auto max-w-4xl fade-in-up" : "mx-auto max-w-6xl fade-in-up";

  const sectionClassName = isEmbedMode
    ? "glass-panel rounded-[28px] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-6"
    : "glass-panel rounded-[32px] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-8";

  const contentGridClassName = isEmbedMode
    ? "grid gap-5 lg:grid-cols-[1.18fr_0.82fr]"
    : "grid gap-8 lg:grid-cols-[1.2fr_0.8fr]";

  const stickySubmitClassName = isEmbedMode
    ? "mt-8 rounded-2xl border border-white/10 bg-slate-950/65 p-3 backdrop-blur"
    : "sticky bottom-3 mt-8 rounded-2xl border border-white/10 bg-slate-950/65 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0";

  const headerClassName = isEmbedMode ? "mb-5" : "mb-8";
  const headerEyebrow = isEmbedMode ? "Fence Estimate" : "Instant Fence Estimator";
  const headerTitle = isEmbedMode ? "Get a quick project range" : "Request Your Fence Estimate";
  const headerDescription = isEmbedMode
    ? "Submit project details and see a preliminary range without leaving the contractor site."
    : "Share your project details and unlock a preliminary pricing range the moment you submit.";
  const formIntroTitle = isEmbedMode ? "Project details" : "Tell us about your project";
  const formIntroDescription = isEmbedMode
    ? "Complete the fields below to route the request and generate an estimate."
    : "Fill out all fields below to generate your estimate and submit your request.";
  const statusShellClassName = isEmbedMode ? "mx-auto max-w-3xl fade-in-up" : "mx-auto max-w-4xl fade-in-up";
  const statusSectionClassName = isEmbedMode
    ? "glass-panel overflow-hidden rounded-[28px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
    : "glass-panel overflow-hidden rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]";
  const statusHeaderClassName = isEmbedMode
    ? "border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5"
    : "border-b border-white/10 px-6 py-6 md:px-10";
  const statusBodyClassName = isEmbedMode ? "px-4 py-5 sm:px-6 sm:py-6" : "px-6 py-8 md:px-10";

  useEffect(() => {
    try {
      setIsEmbedded(window.self !== window.top);
    } catch {
      setIsEmbedded(true);
    }
  }, []);

  useEffect(() => {
    if (!isEmbedMode) {
      setEmbedAccessError("");
      setIsEmbedAccessLoading(false);
      return;
    }

    if (!contractorParam) {
      setEmbedAccessError("Missing contractor in embed URL.");
      return;
    }

    const controller = new AbortController();

    async function validateEmbedAccess() {
      setIsEmbedAccessLoading(true);
      setEmbedAccessError("");

      try {
        const referrer = typeof document !== "undefined" ? document.referrer : "";
        const query = new URLSearchParams({
          contractor: contractorParam,
          referrer,
        });

        if (embedSigParam) {
          query.set("sig", embedSigParam);
        }
        if (embedExpParam) {
          query.set("exp", embedExpParam);
        }

        const res = await fetch(`/api/embed/config?${query.toString()}`, {
          signal: controller.signal,
        });

        const data = (await res.json()) as {
          allowed?: boolean;
          reason?: string;
          tenant?: { primaryColor?: string | null; secondaryColor?: string | null };
        };

        if (!res.ok || data.allowed !== true) {
          setEmbedAccessError(data.reason || "Embed access is not allowed for this host.");
          return;
        }

        setTenantPrimaryColor(data.tenant?.primaryColor ?? "");
        setTenantSecondaryColor(data.tenant?.secondaryColor ?? "");
      } catch {
        if (!controller.signal.aborted) {
          setEmbedAccessError("Unable to validate embed access. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsEmbedAccessLoading(false);
        }
      }
    }

    void validateEmbedAccess();

    return () => {
      controller.abort();
    };
  }, [isEmbedMode, contractorParam, embedSigParam, embedExpParam]);

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
    } else if (customerPhone.replace(/\D/g, "").length < 10) {
      nextErrors.customerPhone = "Please enter a complete 10-digit phone number.";
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
    return "w-full cursor-pointer rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-[15px] text-white outline-none transition duration-200 hover:bg-white/[0.08] focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10";
  }

  function formatPhoneNumber(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
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
        leadSource,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log("QUOTE SUBMIT:", payload);
        console.log("ESTIMATE:", estimate);
      }

      const res = await fetch("/api/quotes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Something went wrong saving your quote.");
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
      <main className={pageMainClassName}>
        <div className={statusShellClassName}>
          <section className={statusSectionClassName}>
            <div className={`${statusHeaderClassName} bg-gradient-to-r from-amber-300/15 via-transparent to-transparent`}>
              <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">
                Loading
              </div>
              <h1 className={isEmbedMode ? "mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" : "mt-4 text-3xl font-semibold tracking-tight md:text-4xl"}>
                Loading contractor configuration
              </h1>
              <p className={isEmbedMode ? "mt-2 max-w-2xl text-sm leading-6 text-slate-300" : "mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base"}>
                {isEmbedMode
                  ? "Resolving the contractor tied to this embedded quote form."
                  : "This quote form is resolving the contractor tied to your embed link."}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!selectedContractor) {
    return (
      <main className={pageMainClassName}>
        <div className={statusShellClassName}>
          <section className={statusSectionClassName}>
            <div className={`${statusHeaderClassName} bg-gradient-to-r from-rose-300/15 via-transparent to-transparent`}>
              <div className="inline-flex rounded-full border border-rose-300/40 bg-rose-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">
                Invalid Quote Link
              </div>
              <h1 className={isEmbedMode ? "mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" : "mt-4 text-3xl font-semibold tracking-tight md:text-4xl"}>
                This contractor link could not be resolved
              </h1>
              <p className={isEmbedMode ? "mt-2 max-w-2xl text-sm leading-6 text-slate-300" : "mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base"}>
                Use a valid contractor identifier in the quote URL, for example
                <span className="font-medium text-white"> ?contractor=aj-fence</span>
                or the contractor UUID.
              </p>
            </div>

            <div className={`${statusBodyClassName} text-sm leading-7 text-slate-300`}>
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
      <main className={pageMainClassName}>
        <div className={statusShellClassName}>
          <section className={statusSectionClassName}>
            <div className={`${statusHeaderClassName} bg-gradient-to-r from-emerald-300/15 via-transparent to-transparent`}>
              <div className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                Estimate Ready
              </div>
              <h1 className={isEmbedMode ? "mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" : "mt-4 text-3xl font-semibold tracking-tight md:text-4xl"}>
                Your preliminary range is unlocked
              </h1>
              <p className={isEmbedMode ? "mt-2 max-w-2xl text-sm leading-6 text-slate-300" : "mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base"}>
                Thanks, {customerName}. Your request is in the contractor dashboard,
                and your current projected range is below.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/80">
                Routed to {selectedContractor.name}
              </p>
            </div>

            <div className={statusBodyClassName}>
              <div className={isEmbedMode ? "rounded-[24px] border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.03] to-transparent p-4 sm:p-5" : "rounded-[26px] border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.03] to-transparent p-6"}>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
                  Estimated Range
                </p>
                <p className="mt-4">
                  <span className={isEmbedMode ? "inline-flex rounded-2xl border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_8px_24px_rgba(245,158,11,0.32)] sm:text-3xl" : "inline-flex rounded-2xl border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-4xl font-extrabold tracking-tight leading-none text-white drop-shadow-[0_8px_24px_rgba(245,158,11,0.32)] md:text-6xl"}>
                    ${estimate.lowEstimate.toLocaleString()} &ndash; ${estimate.highEstimate.toLocaleString()}
                  </span>
                </p>
                <p className={isEmbedMode ? "mt-3 max-w-2xl text-sm leading-6 text-slate-300" : "mt-4 max-w-2xl text-sm leading-7 text-slate-300"}>
                  This estimate is based on your selections and measured fence footage.
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Final pricing may vary based on layout, site access, removal needs, and other field conditions.
                </p>
              </div>

              <div className={isEmbedMode ? "mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center" : "mt-8 flex flex-wrap items-center gap-3"}>
                <button
                  onClick={() => setSubmitted(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.10]"
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

  if (isEmbedMode && embedAccessError) {
    return (
      <main className="px-3 py-4 text-white sm:px-4 sm:py-6">
        <div className="mx-auto max-w-3xl fade-in-up">
          <section className="glass-panel overflow-hidden rounded-[28px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-300">
                Embed Access Blocked
              </p>
            </div>
            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <p className="text-sm text-slate-300">{embedAccessError}</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={pageMainClassName}>
      <div className={pageShellClassName}>
        <header className={headerClassName}>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">
            {headerEyebrow}
          </div>

          <h1 className={isEmbedMode ? "mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl" : "mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl"}>
            {headerTitle}
          </h1>

          <p className={isEmbedMode ? "mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base" : "mt-4 max-w-3xl text-base leading-8 text-slate-300"}>
            {headerDescription}
          </p>

          <p className="mt-4 text-sm font-medium text-amber-200/90">
            Pricing for {selectedContractor.name}
          </p>


        </header>

        <section className={sectionClassName}>
          <div className={contentGridClassName}>
            <form onSubmit={handleSubmit}>
              <div>
                {!isEmbedMode ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Project Details
                  </p>
                ) : null}
                <h2 className={isEmbedMode ? "text-xl font-semibold tracking-tight sm:text-2xl" : "mt-3 text-2xl font-semibold tracking-tight md:text-3xl"}>
                  {formIntroTitle}
                </h2>
                <p className={isEmbedMode ? "mt-2 max-w-2xl text-sm leading-6 text-slate-300" : "mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base"}>
                  {formIntroDescription}
                </p>
              </div>

              <div className={isEmbedMode ? "mt-6 grid gap-4 md:grid-cols-2" : "mt-8 grid gap-5 md:grid-cols-2"}>
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
                      setCustomerPhone(formatPhoneNumber(e.target.value));
                      clearFieldError("customerPhone");
                    }}
                    className={inputClass("customerPhone", customerPhone.trim().length > 0)}
                    placeholder="(555) 555-5555"
                  />
                  {fieldErrors.customerPhone ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.customerPhone}</p> : null}
                </div>

                <div className="grid gap-4 md:col-span-2 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
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
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">City</label>
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
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">State</label>
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
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">ZIP Code</label>
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
                </div>

                <div className="md:col-span-2 mt-4 flex gap-6">
                  <button
                    type="button"
                    disabled={!canSearch}
                    onClick={() => setSearchTrigger((prev) => prev + 1)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Find Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMap((prev) => !prev)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    {showMap ? "Hide Map" : "Open Map"}
                  </button>
                </div>

                {showMap && (
                  <div className="md:col-span-2">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
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

                <div className="md:col-span-2 pb-1 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Fence Specifications</p>
                  <div className="mt-2 h-px bg-white/[0.06]" />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Fence Type</label>
                  <select
                    value={fenceType}
                    onChange={(e) => setFenceType(e.target.value as FenceType)}
                    className={selectClass()}
                  >
                    {FENCE_TYPES.map((type) => (
                      <option
                        key={type}
                        value={type}
                        className="bg-[#111114]"
                        disabled={!availableFenceTypes.has(type)}
                      >
                        {formatFenceType(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Fence Height</label>
                  <select
                    value={fenceHeight}
                    onChange={(e) => setFenceHeight(e.target.value as FenceHeight)}
                    className={selectClass()}
                  >
                    {FENCE_HEIGHTS.map((height) => (
                      <option
                        key={height}
                        value={height}
                        className="bg-[#111114]"
                        disabled={!availableHeightsForFenceType.has(height)}
                      >
                        {height} ft
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Yard Grade</label>
                  <select
                    value={yardGrade}
                    onChange={(e) => setYardGrade(e.target.value as YardGrade)}
                    className={selectClass()}
                  >
                    {YARD_GRADES.map((grade) => (
                      <option key={grade} value={grade} className="bg-[#111114]">
                        {grade === "moderate" ? "Moderate Slope" : formatYardGrade(grade)}
                      </option>
                    ))}
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
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm text-slate-200 transition duration-200 hover:border-amber-400/25 hover:bg-amber-400/[0.05]">
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

              <div className={stickySubmitClassName}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      isPricingLoading ||
                      isEmbedAccessLoading ||
                      !estimate ||
                      estimate.unavailable
                    }
                    style={
                      tenantPrimaryColor
                        ? {
                            backgroundImage: `linear-gradient(to right, ${tenantPrimaryColor}, ${
                              tenantSecondaryColor || tenantPrimaryColor
                            })`,
                          }
                        : undefined
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_4px_20px_rgba(245,158,11,0.28)] transition active:scale-[0.98] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting && (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4a10 10 0 00-10 10h4z" />
                      </svg>
                    )}
                    {isSubmitting
                      ? "Submitting..."
                      : isEmbedAccessLoading
                        ? "Validating Embed..."
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

            <aside className={isEmbedMode ? "space-y-4" : "space-y-5"}>
              <div className={isEmbedMode ? "rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5" : "rounded-3xl border border-white/10 bg-white/[0.03] p-6"}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isEmbedMode ? "Live Summary" : "Current Inputs"}
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

              {!isEmbedMode ? (
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
              ) : (
                <div className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.03] to-transparent p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/80">
                    Embed Mode
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    This widget is trimmed for embedded use and will post height updates to the host page as the map, validation, and estimate states expand or collapse.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function QuotePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen px-4 py-10 text-white">
          <div className="mx-auto max-w-4xl text-center text-slate-400">Loading quote form...</div>
        </main>
      }
    >
      <QuotePageContent />
    </Suspense>
  );
}























