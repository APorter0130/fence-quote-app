import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white antialiased">

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-black/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 11L4.5 6.5L7 9L9.5 4.5L12 7.5"
                  stroke="#000"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-display text-base font-bold tracking-tight text-white">
              FenceQuote
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/admin"
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              Admin
            </Link>
            <Link
              href="/onboard"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition-all hover:bg-white/85"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-28">

        {/* Ambient glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.07] blur-[140px]" />
          <div className="absolute bottom-0 left-1/4 h-[350px] w-[350px] rounded-full bg-amber-600/[0.04] blur-[100px]" />
        </div>

        {/* Subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Eyebrow */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Built for fence contractors
          </div>

          {/* Headline */}
          <h1 className="font-display text-6xl font-black leading-[1.02] tracking-[-0.04em] text-white md:text-7xl lg:text-8xl">
            Your website.
            <br />
            <span className="text-amber-400">Your leads.</span>
            <br />
            On autopilot.
          </h1>

          {/* Sub */}
          <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-white/50 md:text-xl">
            Embed a smart fence quote tool on any website. Homeowners draw,
            calculate, and submit — you get the lead instantly.
          </p>

          {/* CTAs */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboard"
              className="group inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-4 text-base font-bold text-black transition-all hover:bg-amber-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.35)]"
            >
              Start for free
              <svg
                className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 16 16"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link
              href="/embed-preview"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-8 py-4 text-base font-semibold text-white backdrop-blur transition-all hover:border-white/30 hover:bg-white/[0.09]"
            >
              <svg
                className="h-4 w-4 shrink-0 text-white/60"
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 16 16"
              >
                <path
                  d="M6 4l6 4-6 4V4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Live demo
            </Link>
          </div>

          <p className="mt-5 text-xs text-white/20">
            No credit card required · Live in under 10 minutes
          </p>
        </div>

        {/* Product mockup */}
        <div className="relative z-10 mx-auto mt-20 w-full max-w-4xl">
          {/* Browser chrome */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d0d10] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3 border-b border-white/[0.07] bg-[#080809] px-5 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 px-4">
                <div className="mx-auto max-w-xs rounded bg-white/[0.07] py-1.5 text-center text-[11px] text-white/30">
                  yourfencingco.com/quote
                </div>
              </div>
            </div>

            {/* App viewport */}
            <div className="relative h-72 overflow-hidden sm:h-80 md:h-96">
              {/* Map base */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1b2535] via-[#101a26] to-[#0a1018]" />
              {/* Map grid */}
              <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                }}
              />
              {/* Map features / parcels */}
              <div className="absolute inset-0">
                <div className="absolute left-[12%] top-[18%] h-28 w-36 rounded border border-white/10 bg-white/[0.02]" />
                <div className="absolute left-[35%] top-[28%] h-32 w-40 rounded-sm border-2 border-amber-400/70 bg-amber-400/[0.07]">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-black shadow-lg">
                    138 ft · $2,760
                  </div>
                  {/* Draw line indicator */}
                  <div className="absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-amber-400/50" />
                  <div className="absolute bottom-4 left-1/2 top-4 w-[2px] -translate-x-1/2 rounded-full bg-amber-400/50" />
                </div>
                <div className="absolute right-[18%] top-[20%] h-24 w-32 rounded border border-white/[0.08] bg-white/[0.015]" />
                <div className="absolute bottom-[18%] left-[28%] h-18 w-48 rounded border border-white/[0.08] bg-white/[0.015]" />
              </div>

              {/* Side panel */}
              <div className="absolute inset-y-0 right-0 w-52 border-l border-white/[0.08] bg-black/70 p-5 backdrop-blur-sm">
                <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Estimate
                </div>
                <div className="space-y-3 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-white/50">Fence type</span>
                    <span className="font-semibold text-white/90">Wood Privacy</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Length</span>
                    <span className="font-semibold text-white/90">138 ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Rate</span>
                    <span className="font-semibold text-white/90">$20 / ft</span>
                  </div>
                  <div className="my-1 border-t border-white/[0.07]" />
                  <div className="flex justify-between">
                    <span className="font-bold text-white">Total Est.</span>
                    <span className="font-black text-amber-400">$2,760</span>
                  </div>
                </div>
                <button className="mt-5 w-full rounded-lg bg-amber-400 py-2.5 text-[13px] font-bold text-black transition hover:bg-amber-300">
                  Get My Quote
                </button>
              </div>
            </div>
          </div>

          {/* Glow under mockup */}
          <div className="pointer-events-none absolute -bottom-12 left-1/2 h-40 w-2/3 -translate-x-1/2 rounded-full bg-amber-500/[0.09] blur-3xl" />
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────── */}
      <div className="border-y border-white/[0.05] py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
            {[
              { value: "< 10 min", label: "Average setup time" },
              { value: "Zero code", label: "Required from you" },
              { value: "24 / 7", label: "Automated lead capture" },
              { value: "Any site", label: "Platform compatible" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="font-display text-3xl font-black tracking-tight text-white">
                  {value}
                </div>
                <div className="mt-1.5 text-sm text-white/30">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-20 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-400">
              How it works
            </p>
            <h2 className="font-display text-5xl font-black tracking-[-0.03em] text-white">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-white/35">
              No developers required.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create your account",
                body: "Sign up and enter your pricing per linear foot for each fence type you offer.",
                icon: (
                  <svg className="h-5 w-5 shrink-0" width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path
                      d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 5v4l2.5 2.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Paste one line of code",
                body: "Copy your unique embed snippet and drop it into any site builder — Wix, WordPress, Webflow, or plain HTML.",
                icon: (
                  <svg className="h-5 w-5 shrink-0" width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path
                      d="M6 7l-4 4 4 4M14 7l4 4-4 4M12 3l-4 14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Receive leads on autopilot",
                body: "Homeowners draw their fence, get an instant estimate, and submit. You're notified with all their details.",
                icon: (
                  <svg className="h-5 w-5 shrink-0" width="20" height="20" fill="none" viewBox="0 0 20 20">
                    <path
                      d="M3 4h14M3 9h14M3 14h8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
            ].map(({ step, title, body, icon }) => (
              <div
                key={step}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 transition-all hover:border-white/[0.13] hover:bg-white/[0.04]"
              >
                {/* Watermark step number */}
                <div className="pointer-events-none absolute -right-1 -top-2 select-none font-display text-[7rem] font-black leading-none text-white/[0.025]">
                  {step}
                </div>
                <div className="relative">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                    {icon}
                  </div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-400/50">
                    Step {step}
                  </p>
                  <h3 className="mb-3 font-display text-xl font-bold text-white">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/40">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-20 text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-400">
              Features
            </p>
            <h2 className="font-display text-5xl font-black tracking-[-0.03em] text-white">
              Everything you need.
              <br />
              <span className="text-white/35">Nothing you don&apos;t.</span>
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Draw-on-map estimates",
                body: "Homeowners trace their fence line on a satellite map. Real measurements, real estimates.",
                icon: (
                  <svg className="h-6 w-6 shrink-0" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3 9l4-3 4 3 4-4 4 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Property line overlay",
                body: "Auto-loads parcel boundaries so homeowners know exactly where their fence can go.",
                icon: (
                  <svg className="h-6 w-6 shrink-0" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 22V12h6v10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Instant pricing",
                body: "Your rates, your fence types. Estimates are generated instantly based on your custom pricing.",
                icon: (
                  <svg className="h-6 w-6 shrink-0" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "Email notifications",
                body: "Get notified the moment a homeowner submits — with their contact info, fence specs, and map.",
                icon: (
                  <svg className="h-6 w-6 shrink-0" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <rect
                      x="2"
                      y="4"
                      width="20"
                      height="16"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M22 6L12 13 2 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
              {
                title: "CRM integration",
                body: "Webhook support pushes leads directly into your CRM the instant they come in.",
                icon: (
                  <svg className="h-6 w-6 shrink-0" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ),
              },
              {
                title: "White-label ready",
                body: "Match your brand colors. It looks native on your site, not like a third-party widget.",
                icon: (
                  <svg className="h-6 w-6 shrink-0" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ),
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="group rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all hover:border-amber-400/20 hover:bg-amber-400/[0.025]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-white/60 transition-all group-hover:border-amber-400/25 group-hover:bg-amber-400/[0.08] group-hover:text-amber-400">
                  {icon}
                </div>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/40">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Code snippet ───────────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-[#080809]">
            <div className="grid md:grid-cols-[1fr_1.5fr]">
              {/* Text side */}
              <div className="flex flex-col justify-center p-10 md:p-12">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">
                  One snippet
                </p>
                <h2 className="mb-5 font-display text-4xl font-black tracking-tight text-white">
                  Copy.
                  <br />
                  Paste.
                  <br />
                  Done.
                </h2>
                <p className="text-sm leading-relaxed text-white/40">
                  Works with Wix, Squarespace, WordPress, Webflow, or any custom
                  site. If it supports HTML, it works.
                </p>
              </div>

              {/* Code side */}
              <div className="border-t border-white/[0.06] bg-black/50 p-8 md:border-l md:border-t-0 md:p-10">
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <div className="ml-2 text-xs text-white/20">embed.html</div>
                </div>
                <pre className="overflow-x-auto font-mono text-[13px] leading-[1.8]">
                  <span className="text-white/20">{"<!-- Add to your site -->"}</span>
                  {"\n"}
                  <span className="text-amber-300">{"<iframe"}</span>
                  {"\n  "}
                  <span className="text-white/45">{"src="}</span>
                  <span className="text-emerald-400">
                    {'"https://yourapp.com/embed/quote'}
                    <br />
                    {'    ?contractor=your-slug"'}
                  </span>
                  {"\n  "}
                  <span className="text-white/45">{"width="}</span>
                  <span className="text-emerald-400">{'"100%"'}</span>{" "}
                  <span className="text-white/45">{"height="}</span>
                  <span className="text-emerald-400">{'"700"'}</span>
                  {"\n  "}
                  <span className="text-white/45">{"frameborder="}</span>
                  <span className="text-emerald-400">{'"0"'}</span>
                  {"\n"}
                  <span className="text-amber-300">{"></iframe>"}</span>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0d0a00] px-10 py-24 text-center">
            {/* Glow */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.12] blur-[100px]" />
            </div>
            <div className="relative">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-amber-400">
                Ready?
              </p>
              <h2 className="font-display text-5xl font-black tracking-[-0.03em] text-white md:text-6xl">
                Start capturing
                <br />
                <span className="text-amber-400">leads today.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-sm text-lg text-white/40">
                Set up your quote tool in under 10 minutes. No credit card
                required.
              </p>
              <div className="mt-10">
                <Link
                  href="/onboard"
                  className="inline-flex items-center gap-2.5 rounded-full bg-amber-400 px-10 py-5 text-base font-bold text-black transition-all hover:bg-amber-300 hover:shadow-[0_0_60px_rgba(251,191,36,0.4)]"
                >
                  Get started free
                  <svg className="h-4 w-4 shrink-0" width="16" height="16" fill="none" viewBox="0 0 16 16">
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-white/25">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-400/70">
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 11L4.5 6.5L7 9L9.5 4.5L12 7.5"
                  stroke="#000"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span>FenceQuote © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link
              href="/onboard"
              className="transition-colors hover:text-white/55"
            >
              Contractor Signup
            </Link>
            <Link
              href="/admin"
              className="transition-colors hover:text-white/55"
            >
              Admin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
