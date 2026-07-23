"use client";

import { useQuery } from "@tanstack/react-query";
import { api }      from "@/lib/axios";
import type {
  LoungeDetailResponse, LoungeMembersResponse, LoungeMessagesResponse, LoungeReportsResponse,
} from "./types";

async function fetchLoungeDetail(loungeId: string): Promise<LoungeDetailResponse> {
  const { data } = await api.get<LoungeDetailResponse>(`/api/admin/lounges/${loungeId}`);
  return data;
}

export function useLoungeDetail(loungeId: string | null) {
  return useQuery({
    queryKey: ["admin-lounge-detail", loungeId],
    queryFn:  () => fetchLoungeDetail(loungeId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!loungeId,
  });
}

async function fetchLoungeMessages(loungeId: string, page: number): Promise<LoungeMessagesResponse> {
  const { data } = await api.get<LoungeMessagesResponse>(`/api/admin/lounges/${loungeId}/messages`, {
    params: { page, limit: 20 },
  });
  return data;
}

export function useLoungeMessages(loungeId: string | null, page: number) {
  return useQuery({
    queryKey: ["admin-lounge-messages", loungeId, page],
    queryFn:  () => fetchLoungeMessages(loungeId!, page),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!loungeId,
    placeholderData: (previousData) => previousData,
  });
}

async function fetchLoungeReports(loungeId: string): Promise<LoungeReportsResponse> {
  const { data } = await api.get<LoungeReportsResponse>(`/api/admin/lounges/${loungeId}/reports`);
  return data;
}

export function useLoungeReports(loungeId: string | null) {
  return useQuery({
    queryKey: ["admin-lounge-reports", loungeId],
    queryFn:  () => fetchLoungeReports(loungeId!),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!loungeId,
  });
}

async function fetchLoungeMembers(loungeId: string, status: string, page: number): Promise<LoungeMembersResponse> {
  const { data } = await api.get<LoungeMembersResponse>(`/api/admin/lounges/${loungeId}/members`, {
    params: { status, page, limit: 20 },
  });
  return data;
}

export function useLoungeMembers(loungeId: string | null, status: string, page: number) {
  return useQuery({
    queryKey: ["admin-lounge-members", loungeId, status, page],
    queryFn:  () => fetchLoungeMembers(loungeId!, status, page),
    staleTime: 15_000,
    retry:     1,
    enabled:   !!loungeId,
    placeholderData: (previousData) => previousData,
  });
}
