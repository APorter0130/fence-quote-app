import AdminSubmissionsTable from "../../components/admin-submissions-table";
import { createSupabaseClient } from "../../lib/supabase";

type QuoteSubmission = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  fence_type: string;
  fence_height: string;
  yard_grade: string;
  linear_feet: number;
  gates: number;
  tear_out: boolean;
  estimate_low: number;
  estimate_high: number;
  estimate_total?: number;
  estimate_subtotal?: number;
  contractor_id: string;
  contractor_name?: string;
  internal_notes?: string;
  status?: string;
  created_at: string;
};

async function getQuoteSubmissions(): Promise<QuoteSubmission[]> {
  const supabase = createSupabaseClient();

  const detailedSelect = `
    id,
    created_at,
    customer_name,
    customer_email,
    customer_phone,
    address,
    street_address,
    city,
    state,
    zip,
    fence_type,
    fence_height,
    linear_feet,
    gates,
    yard_grade,
    tear_out,
    estimate_low,
    estimate_high,
    estimate_total:estimate_subtotal,
    estimate_subtotal,
    contractor_id,
    contractor_name,
    internal_notes,
    status
  `;

  const { data, error } = await supabase
    .from("quote_submissions")
    .select(detailedSelect)
    .order("created_at", { ascending: false });

  if (error && (error.message.toLowerCase().includes("column") || error.message.toLowerCase().includes("schema cache"))) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("quote_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.error("Error loading quote submissions:", fallbackError);
      return [];
    }

    return (fallbackData ?? []).map((row) => ({
      ...row,
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      estimate_total: row.estimate_subtotal,
    }));
  }

  if (error) {
    console.error("Error loading quote submissions:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    name: row.customer_name,
    email: row.customer_email,
    phone: row.customer_phone,
  }));
}

export default async function AdminPage() {
  const submissions = await getQuoteSubmissions();

  return (
    <main className="min-h-screen px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl fade-in-up">
        <div className="mb-8">
          <div className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            Contractor Console
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="mt-3 text-slate-700">
            View and manage incoming fence quote submissions.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="glass-panel rounded-[28px] bg-gradient-to-br from-amber-300/10 via-white/[0.03] to-transparent p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Total Submissions</p>
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
          <div className="glass-panel rounded-[28px] border-dashed p-10 text-center text-slate-700">
            No quote submissions yet.
          </div>
        ) : (
          <AdminSubmissionsTable initialSubmissions={submissions} />
        )}
      </div>
    </main>
  );
}


