import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin as supabase } from "../../../../lib/supabase-admin";
import {
  calculateQuoteFromPricing,
  type ContractorPricingRow,
} from "../../../../lib/pricing";
import { escapeHtml, telHref } from "../../../../lib/html";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import {
  FENCE_HEIGHTS,
  FENCE_TYPES,
  YARD_GRADES,
  type FenceHeight,
  type FenceType,
  type QuoteSubmissionPayload,
  type YardGrade,
} from "../../../../types/quote";

type ContractorRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  company_name: string;
  crm_webhook_url: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Webhooks are contractor-supplied URLs, so only call public https endpoints. */
function isSafeWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw);

    if (url.protocol !== "https:") {
      return false;
    }

    const host = url.hostname.toLowerCase();

    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
      return false;
    }

    if (host.startsWith("[")) {
      return false;
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const [a, b] = host.split(".").map(Number);

      if (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await req.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return badRequest("Invalid request body");
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return badRequest("Invalid request body");
  }

  // Honeypot: real visitors never see or fill this field. Pretend success so bots move on.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ success: true });
  }

  if (!rateLimit(`quote-ip:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  // ── Validate every field; never trust what the browser sends ─────────────
  const contractorId = cleanText(body.contractor_id, 64);
  const customerName = cleanText(body.customer_name, 100);
  const customerEmail = cleanText(body.customer_email, 254)?.toLowerCase() ?? null;
  const customerPhone = cleanText(body.customer_phone, 30);
  const streetAddress = cleanText(body.street_address, 200);
  const city = cleanText(body.city, 100);
  const state = cleanText(body.state, 2)?.toUpperCase() ?? null;
  const zip = cleanText(body.zip, 5);

  if (!contractorId || !UUID_PATTERN.test(contractorId)) {
    return badRequest("Invalid contractor");
  }
  if (!customerName) {
    return badRequest("Please enter your full name.");
  }
  if (!customerEmail || !EMAIL_PATTERN.test(customerEmail)) {
    return badRequest("Please enter a valid email address.");
  }
  if (!customerPhone || customerPhone.replace(/\D/g, "").length < 10) {
    return badRequest("Please enter a complete phone number.");
  }
  if (!streetAddress || !city || !state || !/^[A-Z]{2}$/.test(state) || !zip || !/^\d{5}$/.test(zip)) {
    return badRequest("Please enter a complete address.");
  }

  const fenceType = String(body.fence_type) as FenceType;
  const fenceHeight = String(body.fence_height) as FenceHeight;
  const yardGrade = String(body.yard_grade) as YardGrade;

  if (!(FENCE_TYPES as readonly string[]).includes(fenceType)) {
    return badRequest("Invalid fence type.");
  }
  if (!(FENCE_HEIGHTS as readonly string[]).includes(fenceHeight)) {
    return badRequest("Invalid fence height.");
  }
  if (!(YARD_GRADES as readonly string[]).includes(yardGrade)) {
    return badRequest("Invalid yard grade.");
  }

  const linearFeet = Number(body.linear_feet);
  const gates = Number(body.gates);
  const tearOut = body.tear_out === true;

  if (!Number.isFinite(linearFeet) || linearFeet <= 0 || linearFeet > 10000) {
    return badRequest("Linear feet must be between 1 and 10,000.");
  }
  if (!Number.isInteger(gates) || gates < 0 || gates > 50) {
    return badRequest("Number of gates must be between 0 and 50.");
  }

  const leadSource =
    typeof body.lead_source === "string" && body.lead_source.trim()
      ? body.lead_source.trim().slice(0, 100)
      : null;

  if (!rateLimit(`quote-email:${contractorId}:${customerEmail}`, 4, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "We already received several requests from this email. Please wait before trying again." },
      { status: 429 }
    );
  }

  // ── Look up the contractor and pricing on the server ─────────────────────
  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, email, phone, company_name, crm_webhook_url")
    .eq("id", contractorId)
    .eq("subscription_status", "active")
    .maybeSingle<ContractorRecord>();

  if (!contractor) {
    return NextResponse.json({ error: "This quote link is no longer active." }, { status: 404 });
  }

  const { data: pricing } = await supabase
    .from("contractor_pricing")
    .select("*")
    .eq("contractor_id", contractor.id)
    .eq("fence_type", fenceType)
    .eq("fence_height", fenceHeight)
    .eq("is_active", true)
    .maybeSingle<ContractorPricingRow>();

  if (!pricing) {
    return badRequest("Pricing for that fence type and height is not available.");
  }

  // The price is always recomputed here, so the saved estimate cannot be tampered with.
  const estimate = calculateQuoteFromPricing(pricing, {
    linearFeet,
    gates,
    yardGrade,
    tearOut,
  });

  const row: QuoteSubmissionPayload = {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    address: [streetAddress, city, state, zip].join(", "),
    street_address: streetAddress,
    city,
    state,
    zip,
    fence_type: fenceType,
    fence_height: fenceHeight,
    yard_grade: yardGrade,
    linear_feet: linearFeet,
    gates,
    tear_out: tearOut,
    contractor_id: contractor.id,
    contractor_name: contractor.company_name,
    estimate_low: estimate.lowEstimate,
    estimate_high: estimate.highEstimate,
    estimate_subtotal: estimate.subtotal,
    estimate_total: estimate.lowEstimate,
    status: "new",
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
    lead_source: leadSource,
  };

  // ── Save (the database is the source of truth) ───────────────────────────
  const { error: insertError } = await supabase.from("quote_submissions").insert(row);

  if (insertError) {
    console.error("[quote submit] insert failed:", insertError.message);
    return NextResponse.json(
      { error: "We couldn't save your request. Please try again." },
      { status: 500 }
    );
  }

  // ── Side effects: failures are logged and never block the response ───────
  const sideEffects: Promise<unknown>[] = [];
  let confirmationSent = false;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (resendKey && fromEmail) {
    const resend = new Resend(resendKey);

    const sendEmail = async (message: {
      to: string;
      subject: string;
      html: string;
      replyTo?: string;
    }): Promise<boolean> => {
      try {
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: message.to,
          subject: message.subject.replace(/[\r\n]+/g, " "),
          html: message.html,
          replyTo: message.replyTo,
        });

        if (error) {
          console.error("[resend] email failed:", error.message);
          return false;
        }

        return true;
      } catch (err) {
        console.error("[resend] email failed:", err);
        return false;
      }
    };

    // 1. New-lead email to the contractor
    if (contractor.email) {
      sideEffects.push(
        sendEmail({
          to: contractor.email,
          subject: `New Fence Quote – ${row.customer_name}`,
          html: buildContractorEmail(row, contractor.company_name),
          replyTo: row.customer_email,
        })
      );
    }

    // 2. Confirmation email to the homeowner
    sideEffects.push(
      sendEmail({
        to: row.customer_email,
        subject: `Your fence estimate from ${contractor.company_name}`,
        html: buildHomeownerEmail(row, contractor.company_name, contractor.phone),
        replyTo: contractor.email ?? undefined,
      }).then((sent) => {
        confirmationSent = sent;
      })
    );
  }

  // 3. CRM / webhook (generic JSON POST — works with Zapier, Make, GoHighLevel, HubSpot, etc.)
  if (contractor.crm_webhook_url && isSafeWebhookUrl(contractor.crm_webhook_url)) {
    sideEffects.push(
      fetch(contractor.crm_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...row,
          webhook_event: "new_quote",
          timestamp: new Date().toISOString(),
        }),
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      }).catch((err) => console.error("[webhook] dispatch failed:", err))
    );
  }

  await Promise.allSettled(sideEffects);

  return NextResponse.json({
    success: true,
    estimate: { low: estimate.lowEstimate, high: estimate.highEstimate },
    confirmation_sent: confirmationSent,
  });
}

// ── Email templates (every value is escaped before it goes into HTML) ────────

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

function buildSpecs(quote: QuoteSubmissionPayload) {
  return [
    quote.fence_type === "chain-link"
      ? "Chain link"
      : quote.fence_type.charAt(0).toUpperCase() + quote.fence_type.slice(1),
    `${quote.fence_height}ft`,
    `${quote.linear_feet} linear ft`,
    quote.gates > 0 ? `${quote.gates} gate${quote.gates > 1 ? "s" : ""}` : null,
    quote.tear_out ? "Tear-out included" : null,
    quote.yard_grade !== "flat" ? `${quote.yard_grade} grade` : null,
  ]
    .filter(Boolean)
    .map((part) => escapeHtml(part))
    .join(" &middot; ");
}

function buildContractorEmail(quote: QuoteSubmissionPayload, companyName: string): string {
  const estimateRange = `${formatMoney(quote.estimate_low)} – ${formatMoney(quote.estimate_high)}`;
  const specs = buildSpecs(quote);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;color:#6b7280;font-size:13px;width:110px;vertical-align:top">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:#111827">${value}</td>
    </tr>`;

  const email = escapeHtml(quote.customer_email);
  const phone = escapeHtml(quote.customer_phone);

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:0 auto">

    <div style="background:#0c0c0d;padding:24px 32px;border-radius:12px 12px 0 0">
      <p style="color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:.08em;margin:0 0 6px 0">NEW QUOTE REQUEST &middot; ${escapeHtml(companyName)}</p>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0">${escapeHtml(quote.customer_name)}</h1>
    </div>

    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">

      <table style="width:100%;border-collapse:collapse">
        ${row("Email", `<a href="mailto:${email}" style="color:#2563eb;text-decoration:none">${email}</a>`)}
        ${row("Phone", `<a href="tel:${escapeHtml(telHref(quote.customer_phone))}" style="color:#2563eb;text-decoration:none">${phone}</a>`)}
        ${row("Address", escapeHtml(quote.address))}
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
          ? `<p style="font-size:12px;color:#9ca3af;margin:0 0 16px 0">Lead source: ${escapeHtml(quote.lead_source)}</p>`
          : ""
      }

      <p style="font-size:12px;color:#6b7280;margin:0">This lead was submitted via your online fence estimator. Reply to this email or call the customer directly.</p>
    </div>

  </div>
</body>
</html>`;
}

function buildHomeownerEmail(
  quote: QuoteSubmissionPayload,
  companyName: string,
  contractorPhone: string | null
): string {
  const estimateRange = `${formatMoney(quote.estimate_low)} – ${formatMoney(quote.estimate_high)}`;
  const company = escapeHtml(companyName);

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:580px;margin:0 auto">

    <div style="background:#0c0c0d;padding:24px 32px;border-radius:12px 12px 0 0">
      <p style="color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:.08em;margin:0 0 6px 0">YOUR FENCE ESTIMATE</p>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0">Thanks, ${escapeHtml(quote.customer_name)}</h1>
    </div>

    <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">

      <p style="font-size:14px;line-height:1.6;color:#111827;margin:0 0 20px 0">
        We received your request and sent it to ${company}. Here is the preliminary range for your project.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:20px">
        <p style="font-size:11px;font-weight:700;letter-spacing:.07em;color:#9ca3af;margin:0 0 4px 0">ESTIMATED RANGE</p>
        <p style="font-size:26px;font-weight:800;margin:0;color:#111827">${estimateRange}</p>
      </div>

      <p style="font-size:11px;font-weight:700;letter-spacing:.07em;color:#9ca3af;margin:0 0 8px 0">YOUR PROJECT</p>
      <p style="font-size:14px;color:#111827;margin:0 0 4px 0">${buildSpecs(quote)}</p>
      <p style="font-size:14px;color:#6b7280;margin:0 0 20px 0">${escapeHtml(quote.address)}</p>

      <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 16px 0">
        This is a preliminary estimate based on the details you entered. Final pricing is confirmed after ${company} reviews your project and checks the site.
      </p>

      <p style="font-size:14px;line-height:1.6;color:#111827;margin:0">
        ${company} will contact you soon. You can reply to this email${
          contractorPhone ? ` or call ${escapeHtml(contractorPhone)}` : ""
        } with any questions.
      </p>
    </div>

  </div>
</body>
</html>`;
}
