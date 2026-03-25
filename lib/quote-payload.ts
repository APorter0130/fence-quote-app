import type { Contractor } from "../data/contractors";
import type { QuoteEstimateResult } from "./pricing";
import type {
  FenceHeight,
  FenceType,
  QuoteSubmissionPayload,
  YardGrade,
} from "../types/quote";

type BuildQuotePayloadParams = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fullAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  fenceType: FenceType;
  fenceHeight: FenceHeight;
  yardGrade: YardGrade;
  linearFeet: number;
  gates: number;
  tearOut: boolean;
  contractor: Contractor;
  estimate: QuoteEstimateResult;
  leadSource?: string | null;
};

export function buildQuotePayload(
  params: BuildQuotePayloadParams
): QuoteSubmissionPayload {
  const {
    customerName,
    customerEmail,
    customerPhone,
    fullAddress,
    streetAddress,
    city,
    state,
    zip,
    fenceType,
    fenceHeight,
    yardGrade,
    linearFeet,
    gates,
    tearOut,
    contractor,
    estimate,
    leadSource,
  } = params;

  return {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    address: fullAddress,
    street_address: streetAddress,
    city,
    state,
    zip,
    fence_type: fenceType,
    fence_height: fenceHeight,
    yard_grade: yardGrade,
    linear_feet: linearFeet,
    gates,
    tear_out: tearOut,
    contractor_id: contractor.id,
    contractor_name: contractor.name,
    estimate_low: estimate.lowEstimate,
    estimate_high: estimate.highEstimate,
    estimate_subtotal: estimate.subtotal,
    estimate_total: estimate.lowEstimate,
    status: "new",
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
    lead_source: leadSource ?? null,
  };
}
