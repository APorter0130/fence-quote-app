import Link from "next/link";

// Contractor whose pricing powers the public demo. Change it with NEXT_PUBLIC_DEMO_CONTRACTOR.
const DEMO_CONTRACTOR = process.env.NEXT_PUBLIC_DEMO_CONTRACTOR || "aj-fence";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center text-slate-900">
      <div className="fade-in-up mx-auto max-w-xl">
        <span className="font-display text-lg font-bold tracking-tight">
          FenceQuote<span className="text-amber-500">.</span>
        </span>

        <div className="mt-8 inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
          Coming soon
        </div>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
          Instant fence estimates for your website
        </h1>

        <p className="mt-5 text-base leading-7 text-slate-700 md:text-lg">
          Homeowners draw their fence on a map, see a price range, and send you the lead. We&apos;re
          opening to a small group of fence contractors first.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href={`/quote?contractor=${encodeURIComponent(DEMO_CONTRACTOR)}`}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 text-sm font-semibold text-slate-900 shadow-[0_4px_20px_rgba(245,158,11,0.28)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Try the estimator
          </Link>
          <p className="text-xs text-slate-500">Free demo. Takes about a minute.</p>
        </div>
      </div>
    </main>
  );
}
