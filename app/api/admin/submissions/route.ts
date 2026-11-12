import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "../../../../lib/admin-auth";
import { supabaseAdmin as supabase } from "../../../../lib/supabase-admin";

const STATUSES = ["new", "contacted", "quoted", "won", "lost"];

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    const parsed: unknown = await req.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Missing submission id." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    update.status = body.status;
  }

  if (body.internal_notes !== undefined) {
    if (typeof body.internal_notes !== "string" || body.internal_notes.length > 5000) {
      return NextResponse.json({ error: "Notes must be 5,000 characters or fewer." }, { status: 400 });
    }

    update.internal_notes = body.internal_notes;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabase.from("quote_submissions").update(update).eq("id", id);

  if (error) {
    console.error("[admin] submission update failed:", error.message);
    return NextResponse.json({ error: "Could not save the change." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
