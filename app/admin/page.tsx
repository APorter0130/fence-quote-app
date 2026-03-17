import AdminSubmissionsTable from "../../components/admin-submissions-table";
import { createSupabaseClient } from "../../lib/supabase";

type QuoteSubmission = {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address: string;
  fence_type: string;
  fence_height: string;
  yard_grade: string;
  linear_feet: number;
  gates: number;
  tear_out: boolean;
  estimate_low: number;
  estimate_high: number;
  estimate_subtotal?: number;
  contractor_id: string;
  contractor_name?: string;
  internal_notes?: string;
  status?: string;
  created_at: string;
};

async function getQuoteSubmissions(): Promise<QuoteSubmission[]> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("quote_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading quote submissions:", error);
    return [];
  }

  return data ?? [];
}

export default async function AdminPage() {
  const submissions = await getQuoteSubmissions();

  return (
    <main className="min-h-screen px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl fade-in-up">
        <div className="mb-8">
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
            Contractor Console
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="mt-3 text-slate-300">
            View and manage incoming fence quote submissions.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="glass-panel rounded-[28px] bg-gradient-to-br from-amber-300/10 via-white/[0.03] to-transparent p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Total Submissions</p>
            <p className="mt-2 text-3xl font-semibold">{submissions.length}</p>
          </div>

          <div className="glass-panel rounded-[28px] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">New Leads</p>
            <p className="mt-2 text-3xl font-semibold">
              {submissions.filter((s) => (s.status ?? "new") === "new").length}
            </p>
          </div>

          <div className="glass-panel rounded-[28px] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/85">Quoted</p>
            <p className="mt-2 text-3xl font-semibold">
              {submissions.filter((s) => s.status === "quoted").length}
            </p>
          </div>

          <div className="glass-panel rounded-[28px] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/85">Won</p>
            <p className="mt-2 text-3xl font-semibold">
              {submissions.filter((s) => s.status === "won").length}
            </p>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="glass-panel rounded-[28px] border-dashed p-10 text-center text-slate-300">
            No quote submissions yet.
          </div>
        ) : (
          <AdminSubmissionsTable initialSubmissions={submissions} />
        )}
      </div>
    </main>
  );
}
