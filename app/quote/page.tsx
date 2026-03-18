"use client";

import { FormEvent, useMemo, useState } from "react";
import FenceDrawMap from "../../components/fence-draw-map";
import { calculateQuoteEstimate } from "../../lib/pricing";
import { contractors } from "../../data/contractors";
import { supabase } from "../../lib/supabase";
import type {
  FenceHeight,
  FenceType,
  QuoteInputs,
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
  const selectedContractor = contractors[0];

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

  const quoteInputs: QuoteInputs = {
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
    address: fullAddress,
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
    customerName,
  };

  const estimate = useMemo(() => {
    return calculateQuoteEstimate(quoteInputs, selectedContractor.pricing);
  }, [quoteInputs, selectedContractor]);

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const nextErrors = validateFields();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    const name = customerName;
    const email = customerEmail;
    const phone = customerPhone;
    const estimateTotal = estimate.subtotal;

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
        estimate_low: estimate.low,
        estimate_high: estimate.high,
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

    if (insertError) {
      setError(insertError?.message || "Something went wrong saving your quote.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
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
            </div>

            <div className="px-6 py-8 md:px-10">
              <div className="rounded-[26px] border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.03] to-transparent p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/85">
                  Estimated Range
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                  ${estimate.low.toLocaleString()} - ${estimate.high.toLocaleString()}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  Final pricing can change based on onsite verification, layout
                  complexity, and final material selection.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Contact
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <p><span className="font-medium text-white">Name:</span> {customerName}</p>
                    <p><span className="font-medium text-white">Email:</span> {customerEmail}</p>
                    <p><span className="font-medium text-white">Phone:</span> {customerPhone}</p>
                    <p><span className="font-medium text-white">Address:</span> {fullAddress}</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Project
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <p><span className="font-medium text-white">Type:</span> {fenceType}</p>
                    <p><span className="font-medium text-white">Height:</span> {fenceHeight} ft</p>
                    <p><span className="font-medium text-white">Grade:</span> {yardGrade}</p>
                    <p><span className="font-medium text-white">Linear Feet:</span> {linearFeet}</p>
                    <p><span className="font-medium text-white">Gates:</span> {gates}</p>
                    <p><span className="font-medium text-white">Tear-out:</span> {tearOut ? "Included" : "No"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSubmitted(false)}
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                >
                  Edit Submission
                </button>
                <span className="text-sm text-slate-400">
                  A contractor can now review your details and contact you.
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
                    <option value="cedar" className="bg-slate-900">Cedar Privacy</option>
                    <option value="vinyl" className="bg-slate-900">Vinyl Privacy</option>
                    <option value="chain-link" className="bg-slate-900">Chain Link</option>
                    <option value="aluminum" className="bg-slate-900">Aluminum</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Fence Height</label>
                  <select
                    value={fenceHeight}
                    onChange={(e) => setFenceHeight(e.target.value as FenceHeight)}
                    className={selectClass()}
                  >
                    <option value="4" className="bg-slate-900">4 ft</option>
                    <option value="6" className="bg-slate-900">6 ft</option>
                    <option value="8" className="bg-slate-900">8 ft</option>
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

              <div className="sticky bottom-3 mt-8 rounded-2xl border border-white/10 bg-slate-950/65 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? "Submitting..." : "Get My Estimate"}
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
                  <p>Type: <span className="font-medium text-white capitalize">{fenceType}</span></p>
                  <p>Height: <span className="font-medium text-white">{fenceHeight} ft</span></p>
                  <p>Yard Grade: <span className="font-medium text-white capitalize">{yardGrade}</span></p>
                  <p>Linear Feet: <span className="font-medium text-white">{linearFeet}</span></p>
                  <p>Gates: <span className="font-medium text-white">{gates}</span></p>
                  <p>Tear-out: <span className="font-medium text-white">{tearOut ? "Included" : "No"}</span></p>
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
