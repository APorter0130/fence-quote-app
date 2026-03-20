import { supabase } from "./supabase";
import type { FenceHeight, FenceType, YardGrade } from "../types/quote";

export type ContractorPricingRow = {
  id: string;
  contractor_id: string;
  fence_type: FenceType;
  fence_height: FenceHeight;
  price_per_foot: number;
  grade_multiplier_flat: number;
  grade_multiplier_moderate: number;
  grade_multiplier_steep: number;
  gate_price: number;
  tear_out_fee: number;
  minimum_job_price: number;
  estimate_high_multiplier: number;
  is_active: boolean;
};

export type QuoteEstimateInputs = {
  contractorId: string;
  fenceType: FenceType;
  fenceHeight: FenceHeight;
  linearFeet: number;
  gates: number;
  yardGrade: YardGrade;
  tearOut?: boolean;
};

export type QuoteEstimateResult = {
  lowEstimate: number;
  highEstimate: number;
  subtotal: number;
  baseTotal: number;
  gateTotal: number;
  tearOutTotal: number;
  pricing: ContractorPricingRow | null;
  unavailable: boolean;
};

export type ContractorPricingOption = Pick<ContractorPricingRow, "fence_type" | "fence_height">;

export async function getContractorPricing(
  contractorId: string,
  fenceType: FenceType,
  fenceHeight: FenceHeight
): Promise<ContractorPricingRow> {
  const { data, error } = await supabase
    .from("contractor_pricing")
    .select("*")
    .eq("contractor_id", contractorId)
    .eq("fence_type", fenceType)
    .eq("fence_height", fenceHeight)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Unable to load contractor pricing.");
  }

  if (!data) {
    throw new Error("Pricing for this fence type and height is not available yet.");
  }

  return data as ContractorPricingRow;
}

export async function getContractorPricingOptions(
  contractorId: string
): Promise<ContractorPricingOption[]> {
  const { data, error } = await supabase
    .from("contractor_pricing")
    .select("fence_type, fence_height")
    .eq("contractor_id", contractorId)
    .eq("is_active", true)
    .order("fence_type", { ascending: true })
    .order("fence_height", { ascending: true });

  if (error) {
    throw new Error(error.message || "Unable to load contractor pricing options.");
  }

  return (data ?? []) as ContractorPricingOption[];
}

export function calculateQuoteFromPricing(
  pricing: ContractorPricingRow,
  inputs: Omit<QuoteEstimateInputs, "contractorId" | "fenceType" | "fenceHeight">
): QuoteEstimateResult {
  const { linearFeet, gates, yardGrade, tearOut = false } = inputs;

  const gradeMultiplier =
    yardGrade === "flat"
      ? Number(pricing.grade_multiplier_flat)
      : yardGrade === "moderate"
        ? Number(pricing.grade_multiplier_moderate)
        : Number(pricing.grade_multiplier_steep);

  const baseTotal = Number(pricing.price_per_foot) * Number(linearFeet) * gradeMultiplier;
  const gateTotal = Number(pricing.gate_price) * Number(gates);

  // Change this to * linearFeet if tear_out_fee is meant to be per-foot
  const tearOutTotal = tearOut ? Number(pricing.tear_out_fee) : 0;

  const subtotal = baseTotal + gateTotal + tearOutTotal;

  const lowEstimate = Math.max(subtotal, Number(pricing.minimum_job_price));
  const highEstimate = lowEstimate * Number(pricing.estimate_high_multiplier);

  return {
    lowEstimate: Math.round(lowEstimate),
    highEstimate: Math.round(highEstimate),
    subtotal: Math.round(subtotal),
    baseTotal: Math.round(baseTotal),
    gateTotal: Math.round(gateTotal),
    tearOutTotal: Math.round(tearOutTotal),
    pricing,
    unavailable: false,
  };
}

export function createUnavailableEstimate(): QuoteEstimateResult {
  return {
    lowEstimate: 0,
    highEstimate: 0,
    subtotal: 0,
    baseTotal: 0,
    gateTotal: 0,
    tearOutTotal: 0,
    pricing: null,
    unavailable: true,
  };
}

export async function calculateQuoteEstimate(
  inputs: QuoteEstimateInputs
): Promise<QuoteEstimateResult> {
  let pricing: ContractorPricingRow;

  try {
    pricing = await getContractorPricing(
      inputs.contractorId,
      inputs.fenceType,
      inputs.fenceHeight
    );
  } catch {
    return createUnavailableEstimate();
  }

  return calculateQuoteFromPricing(pricing, {
    linearFeet: inputs.linearFeet,
    gates: inputs.gates,
    yardGrade: inputs.yardGrade,
    tearOut: inputs.tearOut,
  });
}






