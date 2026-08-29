"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { MeResponse } from "./types";

async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>("/api/admin/me");
  return data;
}

export function useMe() {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-me"],
    queryFn:  fetchMe,
    staleTime: 30_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
  });
}
