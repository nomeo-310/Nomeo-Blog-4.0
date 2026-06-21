"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

/** A plan as returned by GET /api/plans (already serialized + savings computed). */
export interface PlanOption {
  id: string;
  name: string;
  description: string;
  interval: "monthly" | "quarterly" | "biannually" | "yearly";
  months: number;
  priceAmount: number; // e.g., kobo or cents
  priceFormatted: string;
  perMonthAmount: number;
  perMonthFormatted: string;
  currency: string;
  trialDays: number;
  features: { label: string; isHighlighted: boolean }[];
  isHighlighted: boolean;
  isDefault: boolean;
  sortOrder: number;
  isPurchasable: boolean;
  savingsPercent: number;
}

const planKeys = {
  all: ["plans"] as const,
  detail: (id: string) => ["plans", id] as const,
};

/** All active membership plans for the pricing/membership page. */
export function usePlans() {
  const query = useQuery<PlanOption[], Error>({
    queryKey: planKeys.all,
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; plans: PlanOption[] }>("/api/plans");
      
      // Explicit fallback parsing since plain axios won't intercept custom error bodies
      if (!response.data.success) {
        throw new Error("Failed to load plans");
      }
      return response.data.plans;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/** A single plan by id, for the checkout/confirmation step. */
export function usePlan(id: string) {
  type PlanDetailResponse = PlanOption & { externalPriceId: string | null };

  const query = useQuery<PlanDetailResponse, Error>({
    queryKey: planKeys.detail(id),
    queryFn: async () => {
      const response = await axios.get<{ success: boolean; plan: PlanDetailResponse }>(
        `/api/plans/${id}`
      );
      
      if (!response.data.success) {
        throw new Error("Failed to load plan");
      }
      return response.data.plan;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    plan: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}