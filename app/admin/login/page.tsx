type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const reason = Array.isArray(error) ? error[0] : error;

  const message =
    reason === "rate"
      ? "Too many attempts. Please wait a few minutes and try again."
      : reason
        ? "That password wasn't right."
        : "";

  return (
    <main className="min-h-screen px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-sm fade-in-up">
        <section className="glass-panel rounded-[32px] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Contractor Console
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in</h1>

          <form method="post" action="/api/admin/login" className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3.5 text-[15px] text-slate-900 outline-none transition duration-200 focus:border-amber-400/70 focus:ring-4 focus:ring-amber-400/10"
              />
            </div>

            {message ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-[0_4px_20px_rgba(245,158,11,0.28)] transition hover:brightness-110 active:scale-[0.98]"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
