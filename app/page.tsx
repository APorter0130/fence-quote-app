import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold">Fence Estimator</h1>
        <p className="mt-4 text-lg text-gray-600">
          Get an instant preliminary fence estimate for your fencing project.
        </p>

        <Link
          href="/quote"
          className="mt-6 inline-block rounded-xl bg-black px-5 py-3 text-white"
        >
          Start Quote
        </Link>
      </div>
    </main>
  );
}