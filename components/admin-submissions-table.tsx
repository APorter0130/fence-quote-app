"use client";

import { useState } from "react";

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

type Props = {
  initialSubmissions: QuoteSubmission[];
};

const statusOptions = ["new", "contacted", "quoted", "won", "lost"];

function getSubmissionName(submission: QuoteSubmission) {
  return submission.name || submission.customer_name;
}

function getSubmissionPhone(submission: QuoteSubmission) {
  return submission.phone || submission.customer_phone || "No phone provided";
}

function getSubmissionEmail(submission: QuoteSubmission) {
  return submission.email || submission.customer_email || "No email provided";
}

function formatEstimate(submission: QuoteSubmission) {
  return submission.estimate_total != null
    ? `$${submission.estimate_total.toLocaleString()}`
    : `$${submission.estimate_low.toLocaleString()} - $${submission.estimate_high.toLocaleString()}`;
}

function formatSubmissionDate(createdAt: string) {
  return new Date(createdAt).toLocaleDateString();
}

async function saveSubmissionChange(
  id: string,
  changes: { status?: string; internal_notes?: string }
): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });

    if (res.ok) {
      return null;
    }

    if (res.status === 401) {
      return "Your session expired. Please sign in again.";
    }

    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? "Could not save the change.";
  } catch {
    return "Could not save the change. Check your connection and try again.";
  }
}

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

    const saveError = await saveSubmissionChange(id, { status: newStatus });

    if (saveError) {
      setError(saveError);
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

    const saveError = await saveSubmissionChange(id, { internal_notes: newNotes });

    if (saveError) {
      setError(saveError);
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
    return "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-300/65";
  }

  function notesTextareaClass(compact = false) {
    return compact
      ? "min-h-[110px] w-full rounded-xl border border-black/15 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-amber-300/65"
      : "min-h-[90px] w-56 rounded-xl border border-black/15 bg-white p-2 text-sm text-slate-900 outline-none transition focus:border-amber-300/65";
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="space-y-4 lg:hidden">
        {submissions.map((submission) => (
          <article
            key={submission.id}
            className="glass-panel rounded-[28px] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{getSubmissionName(submission)}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {submission.contractor_name ?? submission.contractor_id}
                </p>
              </div>
              <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                {submission.status ?? "new"}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Contact</p>
                <p className="mt-2 text-sm text-slate-700">{getSubmissionPhone(submission)}</p>
                <p className="mt-1 break-all text-sm text-slate-700">{getSubmissionEmail(submission)}</p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Address</p>
                <p className="mt-2 text-sm text-slate-700">{submission.street_address || "-"}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {[submission.city, submission.state, submission.zip].filter(Boolean).join(", ") || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Project</p>
                <p className="mt-2 text-sm text-slate-700">{submission.fence_type} / {submission.fence_height} ft</p>
                <p className="mt-1 text-sm text-slate-700">{submission.linear_feet} ft, {submission.gates} gate(s)</p>
                <p className="mt-1 text-sm text-slate-700">{submission.yard_grade}, {submission.tear_out ? "tear-out" : "no tear-out"}</p>
              </div>

              <div className="rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/12 via-white/[0.03] to-transparent p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100/80">Estimate</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatEstimate(submission)}</p>
                <p className="mt-1 text-sm text-slate-500">Submitted {formatSubmissionDate(submission.created_at)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Status
                </label>
                <select
                  value={submission.status ?? "new"}
                  onChange={(e) => handleStatusChange(submission.id, e.target.value)}
                  disabled={savingId === submission.id}
                  className={statusSelectClass()}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status} className="bg-white text-slate-900">
                      {status}
                    </option>
                  ))}
                </select>

                {savingId === submission.id ? (
                  <div className="mt-2 text-xs text-slate-500">Saving...</div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Internal Notes
                </label>
                <textarea
                  defaultValue={submission.internal_notes || ""}
                  onBlur={(e) => handleNotesChange(submission.id, e.target.value)}
                  className={notesTextareaClass(true)}
                  placeholder="Add internal notes..."
                />

                {notesSavingId === submission.id ? (
                  <div className="mt-2 text-xs text-slate-500">Saving notes...</div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden lg:block">
        <div className="glass-panel overflow-x-auto rounded-[32px] shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Street</th>
                <th className="p-4">City</th>
                <th className="p-4">State</th>
                <th className="p-4">ZIP</th>
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
                  className="border-t border-black/10 align-top text-sm text-slate-700 transition hover:bg-white/[0.025]"
                >
                  <td className="p-4">
                    <div className="font-semibold">{getSubmissionName(submission)}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      {submission.contractor_name ?? submission.contractor_id}
                    </div>
                  </td>

                  <td className="p-4 text-slate-700">
                    {getSubmissionPhone(submission)}
                  </td>

                  <td className="p-4 text-slate-700">
                    {getSubmissionEmail(submission)}
                  </td>

                  <td className="p-4 text-slate-700">{submission.street_address || "-"}</td>

                  <td className="p-4 text-slate-700">{submission.city || "-"}</td>

                  <td className="p-4 text-slate-700">{submission.state || "-"}</td>

                  <td className="p-4 text-slate-700">{submission.zip || "-"}</td>

                  <td className="p-4 text-slate-700">
                    <div>{submission.fence_type}</div>
                    <div className="text-slate-500">
                      {submission.fence_height} ft
                    </div>
                  </td>

                  <td className="p-4 text-slate-700">
                    <div>{submission.linear_feet} ft</div>
                    <div>{submission.gates} gate(s)</div>
                    <div>{submission.yard_grade}</div>
                    <div>{submission.tear_out ? "Tear-out" : "No tear-out"}</div>
                  </td>

                  <td className="p-4 font-semibold">
                    {formatEstimate(submission)}
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
                        <option key={status} value={status} className="bg-white text-slate-900">
                          {status}
                        </option>
                      ))}
                    </select>

                    {savingId === submission.id ? (
                      <div className="mt-2 text-xs text-slate-500">Saving...</div>
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
                      <div className="mt-2 text-xs text-slate-500">Saving notes...</div>
                    ) : null}
                  </td>

                  <td className="p-4 text-slate-500">
                    {formatSubmissionDate(submission.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


