import type { FenceHeight, FenceType, YardGrade } from "../types/quote";

export type PricingConfig = {
  materialPrices: Record<FenceType, number>;
  heightMultipliers: Record<FenceHeight, number>;
  gradeMultipliers: Record<YardGrade, number>;
  gatePrice: number;
  tearOutFee: number;
  estimateHighMultiplier: number;
};

export type Contractor = {
  id: string;
  slug: string;
  name: string;
  accentColor: string;
  pricing: PricingConfig;
};

export const contractors: Contractor[] = [
  {
    id: "edeef6d0-30ae-4eef-bc72-584a1df54620",
    slug: "aj-fence",
    name: "AJ Fence Company",
    accentColor: "#f97316",
    pricing: {
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
    },
  },
  {
    id: "2d1f5d1a-8b33-4b5d-9f7f-1e6058b4f2d1",
    slug: "premium-fence-outdoor",
    name: "Premium Fence & Outdoor",
    accentColor: "#6366f1",
    pricing: {
      materialPrices: {
        cedar: 52,
        vinyl: 58,
        "chain-link": 34,
        aluminum: 68,
      },
      heightMultipliers: {
        "4": 1,
        "6": 1.18,
        "8": 1.35,
      },
      gradeMultipliers: {
        flat: 1,
        moderate: 1.12,
        steep: 1.25,
      },
      gatePrice: 425,
      tearOutFee: 1500,
      estimateHighMultiplier: 1.15,
    },
  },
];

function normalizeContractorIdentifier(value: string) {
  return value.trim().toLowerCase();
}

export function findContractorByIdentifier(identifier: string) {
  const normalizedIdentifier = normalizeContractorIdentifier(identifier);

  return (
    contractors.find((contractor) => {
      return (
        normalizeContractorIdentifier(contractor.id) === normalizedIdentifier ||
        normalizeContractorIdentifier(contractor.slug) === normalizedIdentifier
      );
    }) ?? null
  );
}
