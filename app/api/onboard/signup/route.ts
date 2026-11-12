import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../../lib/supabase-admin";
import { clientIp, rateLimit } from "../../../../lib/rate-limit";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Signup is invite-only: the code lives in the SIGNUP_INVITE_CODE environment variable. */
function inviteCodeMatches(input: unknown): boolean {
  const expected = process.env.SIGNUP_INVITE_CODE?.trim();

  if (!expected || typeof input !== "string") {
    return false;
  }

  const a = createHash("sha256").update(input.trim()).digest();
  const b = createHash("sha256").update(expected).digest();

  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!process.env.SIGNUP_INVITE_CODE?.trim()) {
    return NextResponse.json({ error: "Signups are currently closed." }, { status: 403 });
  }

  if (!rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { company_name, email, phone, slug, invite_code } = body as Record<string, unknown>;

  if (!inviteCodeMatches(invite_code)) {
    return NextResponse.json({ error: "That invite code isn't valid." }, { status: 403 });
  }

  if (typeof company_name !== "string" || !company_name.trim()) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  if (typeof phone !== "string" || !phone.trim()) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }
  if (
    typeof slug !== "string" ||
    slug.length < 3 ||
    slug.length > 48 ||
    !SLUG_PATTERN.test(slug)
  ) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  // Check slug availability
  const { data: existing } = await supabase
    .from("contractors")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
  }

  const editToken = randomBytes(32).toString("hex");

  const { data: newContractor, error: insertError } = await supabase
    .from("contractors")
    .insert({
      company_name: company_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      slug: slug.trim().toLowerCase(),
      subscription_status: "active",
      edit_token: editToken,
    })
    .select("id, slug")
    .single();

  if (insertError) {
    // Handle unique constraint violation on slug race condition
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
    }
    return NextResponse.json(
      { error: insertError.message || "Failed to create contractor account." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: newContractor.id,
    slug: newContractor.slug,
    editToken,
    setupUrl: `/onboard/setup?token=${editToken}`,
  });
}
