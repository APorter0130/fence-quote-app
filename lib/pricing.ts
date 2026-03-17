import type { QuoteEstimate, QuoteInputs } from "../types/quote";
import type { PricingConfig } from "../data/contractors";

export const defaultPricingConfig: PricingConfig = {
  materialPrices: {
    cedar: 45,
    vinyl: 52,
    "chain-link": 30,
    aluminum: 60,
  },
  heightMultipliers: {
    "4": 1,
    "6": 1.15,
    "8": 1.3,
  },
  gradeMultipliers: {
    flat: 1,
    moderate: 1.1,
    steep: 1.2,
  },
  gatePrice: 350,
  tearOutFee: 1200,
  estimateHighMultiplier: 1.12,
};

export function calculateQuoteEstimate(
  inputs: QuoteInputs,
  config: PricingConfig = defaultPricingConfig
): QuoteEstimate {
  const basePricePerFoot = config.materialPrices[inputs.fenceType];
  const heightMultiplier = config.heightMultipliers[inputs.fenceHeight];
  const gradeMultiplier = config.gradeMultipliers[inputs.yardGrade];

  const adjustedFenceCost =
    inputs.linearFeet * basePricePerFoot * heightMultiplier * gradeMultiplier;

  const gateTotal = inputs.gates * config.gatePrice;
  const tearOutTotal = inputs.tearOut ? config.tearOutFee : 0;
  const subtotal = adjustedFenceCost + gateTotal + tearOutTotal;

  return {
    subtotal: Math.round(subtotal),
    low: Math.round(subtotal),
    high: Math.round(subtotal * config.estimateHighMultiplier),
  };
}
