export type FenceType = "cedar" | "vinyl" | "chain-link" | "aluminum";
export type FenceHeight = "4" | "6" | "8";
export type YardGrade = "flat" | "moderate" | "steep";

export type QuoteInputs = {
  customerName: string;
  address: string;
  fenceType: FenceType;
  fenceHeight: FenceHeight;
  yardGrade: YardGrade;
  linearFeet: number;
  gates: number;
  tearOut: boolean;
};

export type QuoteEstimate = {
  low: number;
  high: number;
  subtotal: number;
};
