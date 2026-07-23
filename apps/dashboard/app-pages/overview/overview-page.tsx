"use client";

import { useOverview }      from "./use-overview";
import { OverviewHeader }   from "./components/overview-header";
import { ErrorBanner }      from "./components/error-banner";
import { StatsGrid }        from "./components/stats-grid";
import { SystemAlert }      from "./components/system-alert";
import { RecentActivity }   from "./components/recent-activity";

export default function OverviewPage() {
  const { data, isLoading, isError, refetch, isFetching } = useOverview();

  return (
    <div className="space-y-6">
      <OverviewHeader
        generatedAt={data?.generatedAt}
        isFetching={isFetching}
        onRefresh={() => refetch()}
      />

      {isError && <ErrorBanner onRetry={() => refetch()} />}

      <StatsGrid data={data} isLoading={isLoading} />

      {!isLoading && <SystemAlert unresolvedErrors={data?.unresolvedErrors ?? 0} />}

      <RecentActivity items={data?.recentActivity} isLoading={isLoading} />
    </div>
  );
}
