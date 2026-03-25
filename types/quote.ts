export const FENCE_TYPES = ["cedar", "vinyl", "chain-link", "aluminum"] as const;
export const FENCE_HEIGHTS = ["4", "6", "8"] as const;
export const YARD_GRADES = ["flat", "moderate", "steep"] as const;

export type FenceType = (typeof FENCE_TYPES)[number];
export type FenceHeight = (typeof FENCE_HEIGHTS)[number];
export type YardGrade = (typeof YARD_GRADES)[number];

export type QuoteInputs = {
  name: string;
  email: string;
  phone: string;
  address: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  fenceType: FenceType;
  fenceHeight: FenceHeight;
  yardGrade: YardGrade;
  linearFeet: number;
  gates: number;
  tearOut?: boolean;
  customerName?: string;
};

export type QuoteEstimate = {
  low: number;
  high: number;
  subtotal: number;
};

export type QuoteSubmissionPayload = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  street_address: string;
  city: string;
  state: string;
  zip: string;
  fence_type: FenceType;
  fence_height: FenceHeight;
  yard_grade: YardGrade;
  linear_feet: number;
  gates: number;
  tear_out: boolean;
  contractor_id: string;
  contractor_name: string;
  estimate_low: number;
  estimate_high: number;
  estimate_subtotal: number;
  estimate_total: number;
  status: "new";
  name: string;
  email: string;
  phone: string;
  lead_source: string | null;
};
