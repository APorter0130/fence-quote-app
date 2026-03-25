import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase() ?? "";

  if (!slug) {
    return NextResponse.json({ available: false, error: "Slug is required." }, { status: 400 });
  }

  if (slug.length < 3 || slug.length > 48) {
    return NextResponse.json(
      { available: false, error: "Slug must be between 3 and 48 characters." },
      { status: 400 }
    );
  }

  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { available: false, error: "Slug can only contain lowercase letters, numbers, and hyphens." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("contractors")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ available: false, error: "Database error." }, { status: 500 });
  }

  return NextResponse.json({ available: data === null });
}
