"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

export default function OnboardPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [slugMessage, setSlugMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-derive slug from company name unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(companyName));
    }
  }, [companyName, slugManuallyEdited]);

  // Debounced slug availability check
  useEffect(() => {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);

    if (!slug || slug.length < 3) {
      setSlugState("idle");
      setSlugMessage("");
      return;
    }

    setSlugState("checking");
    setSlugMessage("");

    slugCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/onboard/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = (await res.json()) as { available?: boolean; error?: string };

        if (!res.ok || data.error) {
          setSlugState("invalid");
          setSlugMessage(data.error ?? "Invalid slug.");
          return;
        }

        if (data.available) {
          setSlugState("available");
          setSlugMessage("Available!");
        } else {
          setSlugState("taken");
          setSlugMessage("Already taken - try another.");
        }
      } catch {
        setSlugState("idle");
        setSlugMessage("");
      }
    }, 400);

    return () => {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    };
  }, [slug]);

  function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function inputClass(hasValue: boolean) {
    return `w-full rounded-2xl border ${hasValue ? "border-emerald-300/45 bg-white" : "border-black/10 bg-white"} px-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-500 outline-none transition duration-200 focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10`;
  }

  const slugBorderClass =
    slugState === "available"
      ? "border-emerald-300/45"
      : slugState === "taken" || slugState === "invalid"
        ? "border-rose-400/65"
        : slug.length >= 3
          ? "border-black/10"
          : "border-black/10";

  const slugInputClass = `w-full rounded-2xl border ${slugBorderClass} bg-white px-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-500 outline-none transition duration-200 focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10`;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (slugState !== "available") {
      setError("Please choose an available slug before continuing.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/onboard/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          email,
          phone,
          slug,
          invite_code: inviteCode,
        }),
      });

      const data = (await res.json()) as { setupUrl?: string; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(data.setupUrl!);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-lg fade-in-up">
        <div className="mb-8">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-slate-900"
          >
            &larr; Back
          </Link>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">
            Set up your contractor account
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Create your account in under a minute. You&apos;ll set up your pricing on the next
            screen.
          </p>
        </div>

        <section className="glass-panel rounded-[32px] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                Company Name
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass(companyName.trim().length > 0)}
                placeholder="AJ Fence Company"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass(email.trim().length > 0)}
                placeholder="you@yourcompany.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className={inputClass(phone.trim().length > 0)}
                placeholder="(555) 555-5555"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                Invite Code
              </label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className={inputClass(inviteCode.trim().length > 0)}
                placeholder="Enter the code you were given"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                Your Quote URL Slug
              </label>
              <div className="relative">
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className={slugInputClass}
                  placeholder="aj-fence"
                  spellCheck={false}
                />
                {slugState === "checking" && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4 animate-spin text-slate-500" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4a10 10 0 00-10 10h4z" />
                    </svg>
                  </span>
                )}
              </div>
              {slug.length >= 3 && slugMessage && (
                <p
                  className={`mt-2 text-xs ${
                    slugState === "available" ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {slugMessage}
                </p>
              )}
              {slug && (
                <p className="mt-2 text-xs text-slate-500">
                  Your embed URL will be:{" "}
                  <span className="text-slate-700">
                    /quote?contractor=<span className="text-slate-900">{slug}</span>
                  </span>
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || slugState !== "available"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_4px_20px_rgba(245,158,11,0.28)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4a10 10 0 00-10 10h4z" />
                </svg>
              )}
              {isSubmitting ? "Creating account..." : "Continue to Pricing Setup ->"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}


