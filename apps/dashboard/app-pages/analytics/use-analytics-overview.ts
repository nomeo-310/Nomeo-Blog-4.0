"use client";

import { useQuery }   from "@tanstack/react-query";
import { api }        from "@/lib/axios";
import { authClient } from "@/lib/auth-client";
import { dateWindowToParams } from "./utils";
import type { AnalyticsOverview, DateWindow } from "./types";

async function fetchOverview(window: DateWindow): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>("/api/admin/analytics/overview", {
    params: dateWindowToParams(window),
  });
  return data;
}

export function useAnalyticsOverview(window: DateWindow) {
  const { data: session, isPending } = authClient.useSession();
  return useQuery({
    queryKey: ["admin-analytics-overview", window.preset, window.from?.toISOString(), window.to?.toISOString()],
    queryFn:  () => fetchOverview(window),
    staleTime: 60_000,
    retry:     1,
    enabled:   !isPending && !!session?.user,
  });
}
