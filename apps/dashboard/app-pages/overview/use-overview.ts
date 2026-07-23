import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import type { OverviewData } from "./types";

async function fetchOverview(): Promise<OverviewData> {
  const { data } = await api.get<OverviewData>("/api/admin/overview");
  return data;
}

export function useOverview() {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey:        ["admin-overview"],
    queryFn:         fetchOverview,
    staleTime:       60_000,
    refetchInterval: 60_000,
    retry:           1,
    enabled:         !isPending && !!session?.user,
  });
}
