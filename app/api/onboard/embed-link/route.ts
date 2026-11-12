import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../../../lib/supabase-admin";
import { createEmbedSignature } from "../../../../lib/embed-signature";

async function resolveContractorByToken(token: string) {
  if (!token || token.length !== 64) {
    return null;
  }

  const { data } = await supabase
    .from("contractors")
    .select("id, slug")
    .eq("edit_token", token)
    .maybeSingle<{ id: string; slug: string | null }>();

  return data ?? null;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const contractor = await resolveContractorByToken(token);

  if (!contractor) {
    return NextResponse.json({ error: "Invalid or expired setup token." }, { status: 401 });
  }

  const slugOrId = contractor.slug ?? contractor.id;
  const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
  const clampedDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 365) : 30;
  const expiresAtUnix = Math.floor(Date.now() / 1000) + clampedDays * 24 * 60 * 60;
  const signature = createEmbedSignature({ contractor: slugOrId, expiresAtUnix });

  if (!signature) {
    return NextResponse.json(
      { error: "EMBED_SIGNING_SECRET is not configured." },
      { status: 500 }
    );
  }

  const embedPath = `/embed/quote?contractor=${encodeURIComponent(slugOrId)}&exp=${expiresAtUnix}&sig=${signature}`;

  return NextResponse.json({
    embedPath,
    expiresAtUnix,
    expiresAtIso: new Date(expiresAtUnix * 1000).toISOString(),
  });
}
