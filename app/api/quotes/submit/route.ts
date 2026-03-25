import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { QuoteSubmissionPayload } from "../../../../types/quote";

// Prefer service role key server-side so RLS never blocks; fall back to anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  let body: QuoteSubmissionPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.contractor_id || !body.customer_name || !body.customer_email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── Insert into Supabase (always — this is the source of truth) ──────────
  const { error: insertError } = await supabase
    .from("quote_submissions")
    .insert(body);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message || "Failed to save quote" },
      { status: 500 }
    );
  }

  // ── Fetch contractor notification settings ───────────────────────────────
  const { data: contractor } = await supabase
    .from("contractors")
    .select("email, company_name, crm_type, crm_webhook_url")
    .eq("id", body.contractor_id)
    .maybeSingle<{
      email: string | null;
      company_name: string;
      crm_type: string | null;
      crm_webhook_url: string | null;
    }>();

  // ── Fire side effects in parallel — failure never blocks the response ────
  const sideEffects: Promise<unknown>[] = [];

  // 1. Contractor new-lead email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && contractor?.email) {
    const resend = new Resend(resendKey);
    sideEffects.push(
      resend.emails
        .send({
          from: process.env.RESEND_FROM_EMAIL ?? "quotes@fenceestimate.app",
          to: contractor.email,
          subject: `New Fence Quote – ${body.customer_name}`,
          html: buildContractorEmail(body, contractor.company_name),
        })
        .catch((err) => console.error("[resend] email failed:", err))
    );
  }

  // 2. CRM / webhook (generic JSON POST — works with Zapier, Make, GoHighLevel, HubSpot, etc.)
  if (contractor?.crm_webhook_url) {
    sideEffects.push(
      fetch(contractor.crm_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          webhook_event: "new_quote",
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.error("[webhook] dispatch failed:", err))
    );
  }

  await Promise.allSettled(sideEffects);

  return NextResponse.json({ success: true });
}

// ── Email template ────────────────────────────────────────────────────────────

function buildContractorEmail(
  quote: QuoteSubmissionPayload,
  companyName: string
): string {
  const estimateRange = `$${quote.estimate_low.toLocaleString()} \u2013 $${quote.estimate_high.toLocaleString()}`;

  const specs = [
    quote.fence_type.charAt(0).toUpperCase() + quote.fence_type.slice(1),
    `${quote.fence_height}ft`,
    `${quote.linear_feet} linear ft`,
    quote.gates > 0 ? `${quote.gates} gate${quote.gates > 1 ? "s" : ""}` : null,
    quote.tear_out ? "Tear-out included" : null,
    quote.yard_grade !== "flat" ? `${quote.yard_grade} grade` : null,
  ]
    .filter(Boolean)
    .join(" &middot; ");

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;width:110px;vertical-align:top">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:#111827">${value}</td>
    </tr>`;

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:0 auto">

    <div style="background:#0c0c0d;padding:24px 32px;border-radius:12px 12px 0 0">
      <p style="color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:.08em;margin:0 0 6px 0">NEW QUOTE REQUEST &middot; ${companyName}</p>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0">${quote.customer_name}</h1>
    </div>

    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">

      <table style="width:100%;border-collapse:collapse">
        ${row("Email", `<a href="mailto:${quote.customer_email}" style="color:#2563eb;text-decoration:none">${quote.customer_email}</a>`)}
        ${row("Phone", `<a href="tel:${quote.customer_phone}" style="color:#2563eb;text-decoration:none">${quote.customer_phone}</a>`)}
        ${row("Address", quote.address)}
      </table>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">

      <p style="font-size:11px;font-weight:700;letter-spacing:.07em;color:#9ca3af;margin:0 0 8px 0">FENCE SPECS</p>
      <p style="font-size:15px;font-weight:500;color:#111827;margin:0 0 24px 0">${specs}</p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;letter-spacing:.07em;color:#9ca3af;margin:0 0 4px 0">ESTIMATE RANGE</p>
        <p style="font-size:26px;font-weight:800;margin:0;color:#111827">${estimateRange}</p>
      </div>

      ${
        quote.lead_source
          ? `<p style="font-size:12px;color:#9ca3af;margin:0 0 16px 0">Lead source: ${quote.lead_source}</p>`
          : ""
      }

      <p style="font-size:12px;color:#6b7280;margin:0">This lead was submitted via your online fence estimator. Reply to this email or call the customer directly.</p>
    </div>

  </div>
</body>
</html>`;
}
