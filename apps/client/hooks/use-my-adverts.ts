"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export type AdvertStatus =
  | "draft" | "pending_review" | "approved" | "rejected"
  | "scheduled" | "active" | "paused" | "completed";

export type AdvertPlacement = "feed_card" | "in_article" | "notification_banner" | "modal_popup";

/** One of the current creator's own promotions, as returned by GET /api/adverts. */
export interface MyAdvert {
  id: string;
  type: "sponsored" | "house" | "promoted_post" | "creator_promo";
  placement: AdvertPlacement;
  status: AdvertStatus;
  title: string;
  body: string;
  image: { url: string; publicId: string; width: number | null; height: number | null } | null;
  ctaLabel: string;
  ctaUrl: string;
  postId: string | null;
  reviewNote: string;
  startAt: string | null;
  endAt: string | null;
  metrics: { impressions: number; clicks: number; uniqueImpressions: number; ctr: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdvertBody {
  type: "creator_promo";
  placement: AdvertPlacement;
  title: string;
  body?: string;
  image?: { url: string; publicId: string } | null;
  ctaLabel?: string;
  ctaUrl?: string;
  postId: string;
  startAt?: string | null;
  endAt?: string | null;
}

export interface UpdateAdvertBody {
  id: string;
  title?: string;
  body?: string;
  image?: { url: string; publicId: string } | null;
  ctaLabel?: string;
  ctaUrl?: string;
  startAt?: string | null;
  endAt?: string | null;
  status?: "draft" | "pending_review" | "paused" | "active";
}

const myAdvertsKey = ["my-adverts"] as const;

/** The signed-in creator's own promotions ("my promotions" list). */
export function useMyAdverts() {
  const query = useQuery<MyAdvert[], Error>({
    queryKey: myAdvertsKey,
    queryFn: async () => {
      const { data } = await axios.get<{ success: boolean; adverts: MyAdvert[] }>("/api/adverts");
      if (!data.success) throw new Error("Failed to load promotions");
      return data.adverts;
    },
    staleTime: 30_000,
  });

  return {
    adverts: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/** Creates a new promotion (starts as a draft — submit separately via useUpdateAdvert). */
export function useCreateAdvert() {
  const queryClient = useQueryClient();
  return useMutation<MyAdvert, Error, CreateAdvertBody>({
    mutationFn: async (body) => {
      const { data } = await axios.post<{ success: boolean; advert: MyAdvert; message?: string }>("/api/adverts", body);
      if (!data.success) throw new Error(data.message ?? "Failed to create promotion");
      return data.advert;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myAdvertsKey }),
  });
}

/** Edits a draft, submits it for review, or pauses/resumes an already-approved promotion. */
export function useUpdateAdvert() {
  const queryClient = useQueryClient();
  return useMutation<MyAdvert, Error, UpdateAdvertBody>({
    mutationFn: async ({ id, ...body }) => {
      const { data } = await axios.patch<{ success: boolean; advert: MyAdvert; message?: string }>(`/api/adverts/${id}`, body);
      if (!data.success) throw new Error(data.message ?? "Failed to update promotion");
      return data.advert;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myAdvertsKey }),
  });
}

/** Deletes a draft or rejected promotion. */
export function useDeleteAdvert() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { data } = await axios.delete<{ success: boolean; message?: string }>(`/api/adverts/${id}`);
      if (!data.success) throw new Error(data.message ?? "Failed to delete promotion");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myAdvertsKey }),
  });
}
