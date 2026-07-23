"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api }   from "@/lib/axios";

type LifecycleAction = "approve" | "reject" | "pause" | "resume" | "complete";

function invalidateAdvert(queryClient: ReturnType<typeof useQueryClient>, advertId: string) {
  queryClient.invalidateQueries({ queryKey: ["admin-advert-detail", advertId] });
  queryClient.invalidateQueries({ queryKey: ["admin-adverts-list"] });
}

function apiErrorMessage(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback;
}

export interface CreateAdvertInput {
  type: "house" | "sponsored" | "promoted_post";
  placement: string;
  postId?: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  advertiserName?: string;
  advertiserContact?: string;
  startAt?: string;
  endAt?: string;
}

export function useCreateAdvert(onCreated: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdvertInput) => api.post("/api/admin/adverts", input),
    onSuccess: () => {
      toast.success("Advert created.");
      queryClient.invalidateQueries({ queryKey: ["admin-adverts-list"] });
      onCreated();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to create advert.")),
  });
}

const LIFECYCLE_MESSAGE: Record<LifecycleAction, string> = {
  approve:  "Advert approved.",
  reject:   "Advert rejected.",
  pause:    "Advert paused.",
  resume:   "Advert resumed.",
  complete: "Advert marked complete.",
};

export function useModerateAdvert(advertId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: LifecycleAction; reviewNote?: string; reason?: string }) =>
      api.patch(`/api/admin/adverts/${advertId}`, input),
    onSuccess: (_data, variables) => {
      toast.success(LIFECYCLE_MESSAGE[variables.action]);
      invalidateAdvert(queryClient, advertId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update advert.")),
  });
}

export interface UpdateAdvertFields {
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  placement?: string;
  targeting?: { topics?: string[]; audience?: string; locations?: string[] };
  startAt?: string;
  endAt?: string;
  priority?: number;
  weight?: number;
  maxImpressionsPerUser?: number;
  dismissBehavior?: string;
  popupDelaySeconds?: number;
}

export function useUpdateAdvert(advertId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields: UpdateAdvertFields) =>
      api.patch(`/api/admin/adverts/${advertId}`, { action: "update", fields }),
    onSuccess: () => {
      toast.success("Advert updated.");
      invalidateAdvert(queryClient, advertId);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to update advert.")),
  });
}

export function useDeleteAdvert(advertId: string, onDeleted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reason: string; confirmTitle: string }) =>
      api.delete(`/api/admin/adverts/${advertId}`, { data: input }),
    onSuccess: () => {
      toast.success("Advert permanently deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-adverts-list"] });
      onDeleted();
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete advert.")),
  });
}
