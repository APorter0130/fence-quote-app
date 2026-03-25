import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { verifyEmbedSignature } from "../../../../lib/embed-signature";

type ContractorRow = {
  id: string;
  slug: string | null;
  company_name: string;
  subscription_status: string | null;
  embed_enabled?: boolean | null;
  iframe_parent_origins?: string | null;
  require_embed_signature?: boolean | null;
  brand_primary_color?: string | null;
  brand_secondary_color?: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOrigins(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function safeReferrerOrigin(referrer: string) {
  if (!referrer) {
    return "";
  }

  try {
    return new URL(referrer).origin;
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const contractorRaw = req.nextUrl.searchParams.get("contractor")?.trim() ?? "";
  const referrer = req.nextUrl.searchParams.get("referrer") ?? "";
  const sig = req.nextUrl.searchParams.get("sig") ?? "";
  const expRaw = req.nextUrl.searchParams.get("exp") ?? "";

  if (!contractorRaw) {
    return NextResponse.json({ allowed: false, reason: "Missing contractor." }, { status: 400 });
  }

  const contractorIdentifier = contractorRaw.toLowerCase();
  const query = supabase
    .from("contractors")
    .select("*")
    .eq("subscription_status", "active")
    .limit(1);

  const { data, error } = UUID_PATTERN.test(contractorIdentifier)
    ? await query.eq("id", contractorIdentifier).maybeSingle<ContractorRow>()
    : await query.eq("slug", contractorIdentifier).maybeSingle<ContractorRow>();

  if (error || !data) {
    return NextResponse.json(
      { allowed: false, reason: "Contractor is not active or was not found." },
      { status: 404 }
    );
  }

  const embedEnabled = data.embed_enabled !== false;
  if (!embedEnabled) {
    return NextResponse.json(
      { allowed: false, reason: "Embedding is currently disabled for this contractor." },
      { status: 403 }
    );
  }

  const referrerOrigin = safeReferrerOrigin(referrer);
  const perTenantOrigins = parseOrigins(data.iframe_parent_origins);
  const fallbackOrigins = parseOrigins(process.env.NEXT_PUBLIC_IFRAME_PARENT_ORIGINS);
  const allowedOrigins = perTenantOrigins.length > 0 ? perTenantOrigins : fallbackOrigins;

  if (allowedOrigins.length > 0 && (!referrerOrigin || !allowedOrigins.includes(referrerOrigin))) {
    return NextResponse.json(
      {
        allowed: false,
        reason: "This host origin is not allowed for this embed.",
      },
      { status: 403 }
    );
  }

  const signatureRequired = data.require_embed_signature === true;
  if (signatureRequired) {
    const exp = Number(expRaw);
    const isValid = verifyEmbedSignature({
      contractor: data.slug ?? data.id,
      expiresAtUnix: exp,
      signature: sig,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          allowed: false,
          reason: "Invalid or expired embed signature.",
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({
    allowed: true,
    tenant: {
      id: data.id,
      slug: data.slug ?? data.id,
      name: data.company_name,
      primaryColor: data.brand_primary_color ?? null,
      secondaryColor: data.brand_secondary_color ?? null,
    },
    parentTargetOrigin: referrerOrigin || "*",
    signatureRequired,
  });
}
