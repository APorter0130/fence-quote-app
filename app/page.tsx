import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            FenceQuote<span className="text-amber-400">.</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/onboard"
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-24 text-center">
        {/* Glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-amber-400/10 to-transparent"
        />
        <div className="relative mx-auto max-w-3xl fade-in-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-1.5 text-sm font-medium text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Now available for fence contractors
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
            Turn your website into a
            <br />
            <span className="text-amber-400">24/7 lead machine</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Embed an instant fence quote tool on your website. Homeowners draw
            their fence on a map and get a real estimate - you get the lead
            automatically.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/onboard"
              className="rounded-xl bg-amber-400 px-7 py-3.5 text-base font-semibold text-black shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 hover:shadow-amber-300/30"
            >
              Add it to my website &rarr;
            </Link>
            <Link
              href="/embed-preview"
              className="glass-panel-hover rounded-xl px-7 py-3.5 text-base font-semibold text-slate-900"
            >
              See a live demo
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Up and running in minutes
            </h2>
            <p className="mt-3 text-slate-600">No developers required.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Create your account",
                body: "Sign up and enter your pricing per linear foot for each fence type you offer.",
              },
              {
                step: "2",
                title: "Paste one line of code",
                body: "Copy your unique embed snippet and paste it into your website - works with any site builder.",
              },
              {
                step: "3",
                title: "Get leads on autopilot",
                body: "Homeowners get instant estimates. You receive an email with their details and fence specs.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="glass-panel rounded-2xl p-7">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/15 text-sm font-bold text-amber-400">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Everything you need, nothing you don&apos;t
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "MAP",
                title: "Draw-on-map estimates",
                body: "Homeowners trace their fence line on a satellite map. Real measurements, real estimates.",
              },
              {
                icon: "HOME",
                title: "Property line overlay",
                body: "Automatically loads parcel boundaries so homeowners know exactly where their fence can go.",
              },
              {
                icon: "FAST",
                title: "Instant pricing",
                body: "Your rates, your fence types. Estimates are generated instantly based on your custom pricing.",
              },
              {
                icon: "EMAIL",
                title: "Email notifications",
                body: "Get notified the moment a homeowner submits a quote request - with all their details.",
              },
              {
                icon: "LINK",
                title: "CRM integration",
                body: "Webhook support to push leads directly into your CRM the moment they come in.",
              },
              {
                icon: "BRAND",
                title: "White-label ready",
                body: "Match your brand colors. The tool looks native on your site, not like a third-party widget.",
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="glass-panel-hover rounded-2xl p-6 transition"
              >
                <div className="mb-3 text-2xl">{icon}</div>
                <h3 className="mb-1.5 font-semibold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Embed snippet preview */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="px-8 py-10 md:px-12">
              <div className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-400">
                One snippet
              </div>
              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                Copy. Paste. Done.
              </h2>
              <p className="mb-8 max-w-md text-slate-600">
                Works with Wix, Squarespace, WordPress, Webflow, or any custom
                site. If it supports HTML, it works.
              </p>
              <div className="rounded-xl bg-slate-100 p-5 font-mono text-xs leading-relaxed text-green-400/90">
                <span className="text-slate-500">{"<!-- Add to your site -->"}</span>
                {"\n"}
                <span className="text-amber-300">{"<iframe"}</span>
                {"\n  "}
                <span className="text-slate-600">{"src="}</span>
                <span className="text-green-300">
                  {'"https://yourapp.com/embed/quote?contractor=your-slug"'}
                </span>
                {"\n  "}
                <span className="text-slate-600">{"width="}</span>
                <span className="text-green-300">{'"100%"'}</span>
                {" "}
                <span className="text-slate-600">{"height="}</span>
                <span className="text-green-300">{'"700"'}</span>
                {"\n  "}
                <span className="text-slate-600">{"frameborder="}</span>
                <span className="text-green-300">{'"0"'}</span>
                {"\n"}
                <span className="text-amber-300">{">"}</span>
                <span className="text-amber-300">{"</iframe>"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-4xl font-bold text-slate-900">
            Ready to capture more leads?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Set up your quote tool in under 10 minutes. No credit card required.
          </p>
          <div className="mt-10">
            <Link
              href="/onboard"
              className="inline-block rounded-xl bg-amber-400 px-9 py-4 text-lg font-bold text-black shadow-xl shadow-amber-400/20 transition hover:bg-amber-300"
            >
              Get started free &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
          <span>
            FenceQuote<span className="text-amber-400/60">.</span> (c) {new Date().getFullYear()}
          </span>
          <div className="flex gap-6">
            <Link href="/onboard" className="transition hover:text-slate-600">
              Contractor Signup
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

