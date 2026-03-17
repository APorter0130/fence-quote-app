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
  name: string;
  pricing: PricingConfig;
};

export const contractors: Contractor[] = [
  {
    id: "contractor-1",
    name: "St. Louis Fence Co",
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
    id: "contractor-2",
    name: "Premium Fence & Outdoor",
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
