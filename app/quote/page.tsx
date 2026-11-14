"use client";

import { CSSProperties, FormEvent, Suspense, useEffect, useMemo, useState } from "react";
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

const DEFAULT_ACCENT = "#1F6B4A";

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// Pick dark or white text so a contractor's brand color never makes the button unreadable.
function readableTextOn(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.4 ? "#16201A" : "#FFFFFF";
}

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
  const [showMap] = useState(true);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [submitted, setSubmitted] = useState(false);
  // Anti-spam honeypot: hidden from people, often filled in by bots.
  const [honeypot, setHoneypot] = useState("");
  // The range the server calculated and saved; shown on the confirmation screen.
  const [serverEstimate, setServerEstimate] = useState<{ low: number; high: number } | null>(null);
  // True only when the server confirms the homeowner confirmation email was actually sent.
  const [confirmationSent, setConfirmationSent] = useState(false);
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

  const accent = isHexColor(tenantPrimaryColor) ? tenantPrimaryColor : DEFAULT_ACCENT;
  const onAccent = readableTextOn(accent);
  const themeStyle = { "--accent": accent, "--on-accent": onAccent } as CSSProperties;

  const pageMainClassName = isEmbedMode
    ? "bg-transparent px-1 py-2 text-[#16201A] sm:px-2 sm:py-3"
    : "min-h-screen px-4 py-10 text-[#16201A]";
  const pageShellClassName = "mx-auto max-w-3xl fade-in-up";
  const sectionClassName = "rounded-2xl border border-[#E3E6E1] bg-white p-5 sm:p-8";
  const headerClassName = "mb-6";
  const headerTitle = "Request Your Fence Estimate";
  const headerDescription =
    "Trace your fence on the map, choose your style, and get a price range the moment you submit.";
  const statusShellClassName = "mx-auto max-w-3xl fade-in-up";
  const statusSectionClassName = "overflow-hidden rounded-2xl border border-[#E3E6E1] bg-white";
  const statusHeaderClassName = "border-b border-[#E3E6E1] px-5 py-5 sm:px-8";
  const statusBodyClassName = "px-5 py-6 sm:px-8";

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

  const labelClass = "mb-1.5 block text-[13px] font-medium text-[#4B574F]";

  function inputClass(field: FieldKey, _hasValue?: boolean) {
    const base =
      "h-11 w-full rounded-[10px] border bg-white px-3.5 text-[15px] text-[#16201A] placeholder:text-[#6B766F] outline-none transition focus:ring-1";
    if (fieldErrors[field]) {
      return `${base} border-rose-500 focus:border-rose-500 focus:ring-rose-500`;
    }
    return `${base} border-[#CBD2CC] focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]`;
  }

  function choiceClass(selected: boolean) {
    const base =
      "h-11 rounded-[10px] bg-white px-2 text-sm text-[#16201A] transition disabled:cursor-not-allowed disabled:opacity-40";
    return selected
      ? `${base} border-2 border-[color:var(--accent)] font-semibold`
      : `${base} border border-[#CBD2CC] font-medium hover:bg-[#F6F7F5]`;
  }

  function stepHeader(n: number, title: string) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[color:var(--accent)] text-[13px] font-semibold text-[color:var(--on-accent)]">
          {n}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
    );
  }

  function gradeLabel(value: YardGrade) {
    if (value === "moderate") return "Some slope";
    return formatYardGrade(value);
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
        body: JSON.stringify({ ...payload, website: honeypot }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json?.error || "Something went wrong saving your quote.");
        return;
      }

      if (
        json?.estimate &&
        typeof json.estimate.low === "number" &&
        typeof json.estimate.high === "number"
      ) {
        setServerEstimate({ low: json.estimate.low, high: json.estimate.high });
      }

      setConfirmationSent(json?.confirmation_sent === true);

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

  if (isContractorLoading && isEmbedMode) {
    return (
      <main className={pageMainClassName} style={themeStyle}>
        <p className="py-10 text-center text-sm text-slate-500">Loading&hellip;</p>
      </main>
    );
  }

  if (isContractorLoading) {
    return (
      <main className={pageMainClassName} style={themeStyle}>
        <div className={statusShellClassName}>
          <section className={statusSectionClassName}>
            <div className={statusHeaderClassName}>
              <div className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Loading
              </div>
              <h1 className={isEmbedMode ? "mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" : "mt-4 text-3xl font-semibold tracking-tight md:text-4xl"}>
                Loading your estimate form
              </h1>
              <p className={isEmbedMode ? "mt-2 max-w-2xl text-sm leading-6 text-slate-700" : "mt-3 max-w-2xl text-sm leading-7 text-slate-700 md:text-base"}>
                One moment while we get things ready.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!selectedContractor) {
    return (
      <main className={pageMainClassName} style={themeStyle}>
        <div className={statusShellClassName}>
          <section className={statusSectionClassName}>
            <div className={statusHeaderClassName}>
              <div className="inline-flex rounded-full border border-rose-300/40 bg-rose-300/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                Link Not Active
              </div>
              <h1 className={isEmbedMode ? "mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" : "mt-4 text-3xl font-semibold tracking-tight md:text-4xl"}>
                This estimate link isn&apos;t working
              </h1>
              <p className={isEmbedMode ? "mt-2 max-w-2xl text-sm leading-6 text-slate-700" : "mt-3 max-w-2xl text-sm leading-7 text-slate-700 md:text-base"}>
                Please contact the company that shared this link and ask for an updated one.
              </p>
            </div>

            <div className={`${statusBodyClassName} text-sm leading-7 text-slate-700`}>
              <p>
                We couldn&apos;t match this link to an active company, so the form is turned off and nothing has been submitted.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (submitted && estimate) {
    const low = serverEstimate?.low ?? estimate.lowEstimate;
    const high = serverEstimate?.high ?? estimate.highEstimate;
    return (
      <main className={pageMainClassName} style={themeStyle}>
        <div className={statusShellClassName}>
          <section className={`${statusSectionClassName} p-6 sm:p-8`}>
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: `${accent}1A`, color: accent === DEFAULT_ACCENT ? accent : "#16201A" }}
            >
              Your estimate is ready
            </span>

            <p className="mt-5 text-[13px] font-medium text-[#4B574F]">Estimated range</p>
            <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
              ${low.toLocaleString()} &ndash; ${high.toLocaleString()}
            </p>

            <div className="my-6 h-px bg-[#E3E6E1]" />

            <dl className="space-y-2 text-sm text-[#4B574F]">
              <div className="flex justify-between">
                <dt>Fence</dt>
                <dd className="font-medium text-[#16201A]">
                  {fenceHeight} ft {formatFenceType(fenceType).toLowerCase()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Length</dt>
                <dd className="font-medium text-[#16201A]">{linearFeet} ft</dd>
              </div>
              <div className="flex justify-between">
                <dt>Gates</dt>
                <dd className="font-medium text-[#16201A]">{gates}</dd>
              </div>
            </dl>

            <p className="mt-6 text-sm leading-6 text-[#4B574F]">
              Thanks, {customerName}. {selectedContractor.name} has your request and will contact you to
              confirm pricing and schedule a site visit.
              {confirmationSent ? ` We also emailed a copy of this estimate to ${customerEmail}.` : ""}
            </p>
            <p className="mt-3 text-xs leading-5 text-[#6B766F]">
              Final pricing may vary based on layout, site access, removal needs, and other field conditions.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (isEmbedMode && embedAccessError) {
    return (
      <main className="px-3 py-4 text-slate-900 sm:px-4 sm:py-6">
        <div className="mx-auto max-w-3xl fade-in-up">
          <section className="overflow-hidden rounded-2xl border border-[#E3E6E1] bg-white">
            <div className="border-b border-black/10 px-4 py-4 sm:px-6 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">
                Estimator Unavailable
              </p>
            </div>
            <div className="px-4 py-5 sm:px-6 sm:py-6">
              <p className="text-sm text-slate-700">
                This estimator isn&apos;t available on this page. Please contact the business directly.
              </p>
              <p className="mt-3 text-xs text-slate-500">Details for the site owner: {embedAccessError}</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={pageMainClassName} style={themeStyle}>
      <div className={pageShellClassName}>
        {!isEmbedMode ? (
          <header className={headerClassName}>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{headerTitle}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[#4B574F]">{headerDescription}</p>
            <p className="mt-3 text-sm font-medium text-[#4B574F]">Pricing for {selectedContractor.name}</p>
          </header>
        ) : null}

        <section className={sectionClassName}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
            >
              <label>
                Website
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
            </div>

            {/* 1. Property */}
            <div className="flex flex-col gap-3">
              {stepHeader(1, "Find your property")}
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-6">
                  <label htmlFor="q-street" className={labelClass}>Street address</label>
                  <input
                    id="q-street"
                    type="text"
                    value={streetAddress}
                    onChange={(e) => {
                      setStreetAddress(e.target.value);
                      clearFieldError("streetAddress");
                    }}
                    placeholder="123 Main St"
                    className={inputClass("streetAddress")}
                    autoComplete="address-line1"
                  />
                  {fieldErrors.streetAddress ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.streetAddress}</p> : null}
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="q-city" className={labelClass}>City</label>
                  <input
                    id="q-city"
                    type="text"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      clearFieldError("city");
                    }}
                    placeholder="Chesterfield"
                    className={inputClass("city")}
                    autoComplete="address-level2"
                  />
                  {fieldErrors.city ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.city}</p> : null}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="q-state" className={labelClass}>State</label>
                  <input
                    id="q-state"
                    type="text"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value.toUpperCase().slice(0, 2));
                      clearFieldError("state");
                    }}
                    placeholder="MO"
                    className={inputClass("state")}
                    maxLength={2}
                    autoComplete="address-level1"
                  />
                  {fieldErrors.state ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.state}</p> : null}
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <label htmlFor="q-zip" className={labelClass}>ZIP</label>
                  <input
                    id="q-zip"
                    type="text"
                    value={zip}
                    onChange={(e) => {
                      setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                      clearFieldError("zip");
                    }}
                    placeholder="63017"
                    className={inputClass("zip")}
                    inputMode="numeric"
                    autoComplete="postal-code"
                  />
                  {fieldErrors.zip ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.zip}</p> : null}
                </div>
              </div>

              <button
                type="button"
                disabled={!canSearch}
                onClick={() => setSearchTrigger((prev) => prev + 1)}
                className="h-11 w-full rounded-[10px] border border-[#CBD2CC] bg-white text-sm font-medium text-[#16201A] transition hover:bg-[#F6F7F5] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Find my property on the map
              </button>
            </div>

            {/* 2. Map */}
            <div className="flex flex-col gap-3">
              {stepHeader(2, "Tap the map to trace your fence")}
              {showMap ? (
                <div className="rounded-xl border border-[#E3E6E1] bg-[#F6F7F5] p-2 sm:p-3">
                  <FenceDrawMap
                    address={fullAddress}
                    searchTrigger={searchTrigger}
                    onDistanceChange={(feet) => {
                      setLinearFeet(feet);
                    }}
                  />
                </div>
              ) : null}
            </div>

            {/* 3. Fence */}
            <div className="flex flex-col gap-4">
              {stepHeader(3, "Choose your fence")}

              <div>
                <span className={labelClass}>Style</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {FENCE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={!availableFenceTypes.has(type)}
                      aria-pressed={fenceType === type}
                      onClick={() => setFenceType(type)}
                      className={choiceClass(fenceType === type)}
                    >
                      {formatFenceType(type)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className={labelClass}>Height</span>
                  <div className="grid grid-cols-3 gap-2">
                    {FENCE_HEIGHTS.map((height) => (
                      <button
                        key={height}
                        type="button"
                        disabled={!availableHeightsForFenceType.has(height)}
                        aria-pressed={fenceHeight === height}
                        onClick={() => setFenceHeight(height)}
                        className={choiceClass(fenceHeight === height)}
                      >
                        {height} ft
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className={labelClass}>Yard slope</span>
                  <div className="grid grid-cols-3 gap-2">
                    {YARD_GRADES.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        aria-pressed={yardGrade === grade}
                        onClick={() => setYardGrade(grade)}
                        className={choiceClass(yardGrade === grade)}
                      >
                        {gradeLabel(grade)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="q-feet" className={labelClass}>Fence length (ft)</label>
                  <input
                    id="q-feet"
                    type="number"
                    min={0}
                    value={linearFeet}
                    onChange={(e) => {
                      setLinearFeet(Number(e.target.value));
                      clearFieldError("linearFeet");
                    }}
                    className={inputClass("linearFeet")}
                  />
                  <p className="mt-1.5 text-xs text-[#6B766F]">Filled in from the map. Adjust it if you need to.</p>
                  {fieldErrors.linearFeet ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.linearFeet}</p> : null}
                </div>

                <div>
                  <span className={labelClass}>Gates</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Fewer gates"
                      onClick={() => {
                        setGates(Math.max(0, gates - 1));
                        clearFieldError("gates");
                      }}
                      className="h-11 w-11 rounded-[10px] border border-[#CBD2CC] bg-white text-lg text-[#16201A] transition hover:bg-[#F6F7F5]"
                    >
                      &minus;
                    </button>
                    <span className="min-w-6 text-center text-base font-semibold" aria-live="polite">{gates}</span>
                    <button
                      type="button"
                      aria-label="More gates"
                      onClick={() => {
                        setGates(gates + 1);
                        clearFieldError("gates");
                      }}
                      className="h-11 w-11 rounded-[10px] border border-[#CBD2CC] bg-white text-lg text-[#16201A] transition hover:bg-[#F6F7F5]"
                    >
                      +
                    </button>
                  </div>
                  {fieldErrors.gates ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.gates}</p> : null}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={tearOut}
                  onChange={(e) => setTearOut(e.target.checked)}
                  className="h-5 w-5 accent-[color:var(--accent)]"
                />
                Remove my existing fence
              </label>
            </div>

            {/* 4. Contact */}
            <div className="flex flex-col gap-3">
              {stepHeader(4, "Where should we send it?")}
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="q-name" className={labelClass}>Full name</label>
                  <input
                    id="q-name"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      clearFieldError("customerName");
                    }}
                    className={inputClass("customerName")}
                    placeholder="John Smith"
                    autoComplete="name"
                  />
                  {fieldErrors.customerName ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.customerName}</p> : null}
                </div>

                <div>
                  <label htmlFor="q-email" className={labelClass}>Email</label>
                  <input
                    id="q-email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      clearFieldError("customerEmail");
                    }}
                    className={inputClass("customerEmail")}
                    placeholder="john@email.com"
                    autoComplete="email"
                  />
                  {fieldErrors.customerEmail ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.customerEmail}</p> : null}
                </div>

                <div>
                  <label htmlFor="q-phone" className={labelClass}>Phone</label>
                  <input
                    id="q-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(formatPhoneNumber(e.target.value));
                      clearFieldError("customerPhone");
                    }}
                    className={inputClass("customerPhone")}
                    placeholder="(555) 555-5555"
                    autoComplete="tel"
                  />
                  {fieldErrors.customerPhone ? <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.customerPhone}</p> : null}
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
              ) : null}

              {!error && pricingError ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{pricingError}</div>
              ) : null}

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  isPricingLoading ||
                  isEmbedAccessLoading ||
                  !estimate ||
                  estimate.unavailable
                }
                className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--accent)] text-base font-semibold text-[color:var(--on-accent)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                      : "Get my estimate"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function QuotePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-4xl text-center text-slate-500">Loading quote form...</div>
        </main>
      }
    >
      <QuotePageContent />
    </Suspense>
  );
}

























