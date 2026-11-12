import { useEffect, useState } from "react";
import type { Contractor } from "../data/contractors";
import { resolveContractor } from "./contractors";
import {
  getContractorPricing,
  getContractorPricingOptions,
  type ContractorPricingOption,
  type ContractorPricingRow,
} from "./pricing";
import type { FenceHeight, FenceType } from "../types/quote";

type UseContractorConfigResult = {
  contractor: Contractor | null;
  pricing: ContractorPricingRow | null;
  pricingOptions: ContractorPricingOption[];
  isLoading: boolean;
  error: string;
};

export function useContractorConfig(
  slug: string,
  fenceType: FenceType,
  fenceHeight: FenceHeight
): UseContractorConfigResult {
  // Start empty and "loading" so a visitor never sees another company's form flash by first.
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [pricing, setPricing] = useState<ContractorPricingRow | null>(null);
  const [pricingOptions, setPricingOptions] = useState<ContractorPricingOption[]>([]);
  const [isContractorLoading, setIsContractorLoading] = useState(true);
  const [isPricingLoading, setIsPricingLoading] = useState(false);
  const [isPricingOptionsLoading, setIsPricingOptionsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadContractor() {
      setIsContractorLoading(true);
      setError("");

      try {
        const resolvedContractor = await resolveContractor(slug.trim());

        if (isCancelled) {
          return;
        }

        if (!resolvedContractor) {
          setContractor(null);
          setPricing(null);
          setPricingOptions([]);
          setError("Invalid contractor configuration. Please use a valid quote link.");
          return;
        }

        setContractor(resolvedContractor);
      } catch {
        if (isCancelled) {
          return;
        }

        setContractor(null);
        setPricing(null);
        setPricingOptions([]);
        setError("Unable to load contractor configuration right now. Please try again.");
      } finally {
        if (!isCancelled) {
          setIsContractorLoading(false);
        }
      }
    }

    loadContractor();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPricingOptions() {
      if (!contractor) {
        setPricingOptions([]);
        return;
      }

      setIsPricingOptionsLoading(true);

      try {
        const options = await getContractorPricingOptions(contractor.id);

        if (isCancelled) {
          return;
        }

        setPricingOptions(options);
      } catch {
        if (isCancelled) {
          return;
        }

        setPricingOptions([]);
      } finally {
        if (!isCancelled) {
          setIsPricingOptionsLoading(false);
        }
      }
    }

    loadPricingOptions();

    return () => {
      isCancelled = true;
    };
  }, [contractor]);

  useEffect(() => {
    let isCancelled = false;

    async function loadPricing() {
      if (!contractor) {
        setPricing(null);
        return;
      }

      setIsPricingLoading(true);
      setError((prev) => {
        if (prev === "Estimate unavailable for this fence type and height.") {
          return "";
        }

        return prev;
      });

      try {
        const nextPricing = await getContractorPricing(contractor.id, fenceType, fenceHeight);

        if (isCancelled) {
          return;
        }

        setPricing(nextPricing);
      } catch {
        if (isCancelled) {
          return;
        }

        setPricing(null);
        setError("Estimate unavailable for this fence type and height.");
      } finally {
        if (!isCancelled) {
          setIsPricingLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      isCancelled = true;
    };
  }, [contractor, fenceType, fenceHeight]);

  return {
    contractor,
    pricing,
    pricingOptions,
    isLoading: isContractorLoading || isPricingLoading || isPricingOptionsLoading,
    error,
  };
}
