import { contractors, findContractorByIdentifier, type Contractor } from "../data/contractors";
import { supabase } from "./supabase";

type ContractorRow = {
  id: string;
  slug: string | null;
  company_name: string;
  subscription_status: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getFallbackPricing(identifier: string) {
  return findContractorByIdentifier(identifier)?.pricing ?? contractors[0].pricing;
}

function mapRowToContractor(row: ContractorRow, identifier: string): Contractor {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    name: row.company_name,
    pricing: getFallbackPricing(identifier),
  };
}

export async function resolveContractor(identifier: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  // No contractor in the link: never fall back to a hard-coded company.
  if (!normalizedIdentifier) {
    return null;
  }

  const query = supabase
    .from("contractors")
    .select("id, slug, company_name, subscription_status")
    .eq("subscription_status", "active")
    .limit(1);

  const { data, error } = UUID_PATTERN.test(normalizedIdentifier)
    ? await query.eq("id", normalizedIdentifier).maybeSingle<ContractorRow>()
    : await query.eq("slug", normalizedIdentifier).maybeSingle<ContractorRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapRowToContractor(data, normalizedIdentifier);
}