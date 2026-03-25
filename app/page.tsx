import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold">Fence Estimator</h1>
        <p className="mt-4 text-lg text-gray-600">
          Get an instant preliminary fence estimate for your fencing project.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/quote"
            className="inline-block rounded-xl bg-black px-5 py-3 text-white"
          >
            Start Quote
          </Link>

          <Link
            href="/embed-preview"
            className="inline-block rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-white"
          >
            Preview Embed
          </Link>

          <Link
            href="/onboard"
            className="inline-block rounded-xl border border-white/15 bg-white/[0.05] px-5 py-3 text-white"
          >
            Contractor Signup
          </Link>
        </div>
      </div>
    </main>
  );
}