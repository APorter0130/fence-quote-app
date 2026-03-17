"use client";

import { useState } from "react";
import { createSupabaseClient } from "../lib/supabase";

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

type Props = {
  initialSubmissions: QuoteSubmission[];
};

const statusOptions = ["new", "contacted", "quoted", "won", "lost"];

export default function AdminSubmissionsTable({
  initialSubmissions,
}: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesSavingId, setNotesSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleStatusChange(id: string, newStatus: string) {
    setError("");
    setSavingId(id);

    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from("quote_submissions")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Status update error:", error);
      setError(error.message);
      setSavingId(null);
      return;
    }

    setSubmissions((prev) =>
      prev.map((submission) =>
        submission.id === id
          ? { ...submission, status: newStatus }
          : submission
      )
    );

    setSavingId(null);
  }

  async function handleNotesChange(id: string, newNotes: string) {
    setError("");
    setNotesSavingId(id);

    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from("quote_submissions")
      .update({ internal_notes: newNotes })
      .eq("id", id);

    if (error) {
      console.error("Notes update error:", error);
      setError(error.message);
      setNotesSavingId(null);
      return;
    }

    setSubmissions((prev) =>
      prev.map((submission) =>
        submission.id === id
          ? { ...submission, internal_notes: newNotes }
          : submission
      )
    );

    setNotesSavingId(null);
  }

  function statusSelectClass() {
    return "rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none transition focus:border-amber-300/65";
  }

  function notesTextareaClass() {
    return "min-h-[90px] w-56 rounded-xl border border-white/15 bg-white/[0.06] p-2 text-sm text-white outline-none transition focus:border-amber-300/65";
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="glass-panel overflow-x-auto rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <table className="min-w-full border-collapse">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
              <th className="p-4">Customer</th>
              <th className="p-4">Email</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Address</th>
              <th className="p-4">Fence</th>
              <th className="p-4">Project</th>
              <th className="p-4">Estimate</th>
              <th className="p-4">Status</th>
              <th className="p-4">Notes</th>
              <th className="p-4">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr
                key={submission.id}
                className="border-t border-white/10 align-top text-sm text-slate-200 transition hover:bg-white/[0.025]"
              >
                <td className="p-4">
                  <div className="font-semibold">{submission.customer_name}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    {submission.contractor_name ?? submission.contractor_id}
                  </div>
                </td>

                <td className="p-4 text-slate-300">
                  {submission.customer_email || "No email provided"}
                </td>

                <td className="p-4 text-slate-300">
                  {submission.customer_phone || "No phone provided"}
                </td>

                <td className="p-4 text-slate-300">{submission.address}</td>

                <td className="p-4 text-slate-300">
                  <div>{submission.fence_type}</div>
                  <div className="text-slate-400">
                    {submission.fence_height} ft
                  </div>
                </td>

                <td className="p-4 text-slate-300">
                  <div>{submission.linear_feet} ft</div>
                  <div>{submission.gates} gate(s)</div>
                  <div>{submission.yard_grade}</div>
                  <div>{submission.tear_out ? "Tear-out" : "No tear-out"}</div>
                </td>

                <td className="p-4 font-semibold">
                  ${submission.estimate_low.toLocaleString()} - $
                  {submission.estimate_high.toLocaleString()}
                </td>

                <td className="p-4">
                  <select
                    value={submission.status ?? "new"}
                    onChange={(e) =>
                      handleStatusChange(submission.id, e.target.value)
                    }
                    disabled={savingId === submission.id}
                    className={statusSelectClass()}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status} className="bg-slate-900 text-white">
                        {status}
                      </option>
                    ))}
                  </select>

                  {savingId === submission.id ? (
                    <div className="mt-2 text-xs text-slate-400">Saving...</div>
                  ) : null}
                </td>

                <td className="p-4">
                  <textarea
                    defaultValue={submission.internal_notes || ""}
                    onBlur={(e) => handleNotesChange(submission.id, e.target.value)}
                    className={notesTextareaClass()}
                    placeholder="Add internal notes..."
                  />

                  {notesSavingId === submission.id ? (
                    <div className="mt-2 text-xs text-slate-400">Saving notes...</div>
                  ) : null}
                </td>

                <td className="p-4 text-slate-400">
                  {new Date(submission.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
