"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button }   from "@/components/ui/button";
import { useLoungeReports }       from "../use-lounge-detail";
import { useLoungeReportAction }  from "../use-lounge-mutations";
import { formatDateTime, titleCase } from "../utils";

export function LoungeReportsTab({ loungeId }: { loungeId: string }) {
  const { data, isLoading } = useLoungeReports(loungeId);
  const reportAction = useLoungeReportAction(loungeId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  const reports = data?.reports ?? [];
  if (reports.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No reports have been filed in this lounge.</p>;
  }

  const pending  = reports.filter((r) => !r.reviewed);
  const reviewed = reports.filter((r) => r.reviewed);

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Open reports ({pending.length})</h3>
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.reportId} className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-foreground">{titleCase(r.reason)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.reportedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Reported by {r.reportedBy.name} ({r.reportedBy.email})</p>
                <p className="mt-1.5 rounded-lg bg-background/60 px-2 py-1.5 text-sm text-foreground">{r.messageBody}</p>
                {r.details && <p className="mt-1.5 text-sm text-foreground">{r.details}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button" size="sm" variant="outline"
                    disabled={reportAction.isPending}
                    onClick={() => reportAction.mutate({ messageId: r.messageId, reportId: r.reportId, action: "review" })}
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    type="button" size="sm" variant="outline"
                    disabled={reportAction.isPending}
                    onClick={() => reportAction.mutate({ messageId: r.messageId, reportId: r.reportId, action: "dismiss" })}
                  >
                    Dismiss
                  </Button>
                  <Button
                    type="button" size="sm" variant="destructive"
                    disabled={reportAction.isPending}
                    onClick={() => reportAction.mutate({ messageId: r.messageId, reportId: r.reportId, action: "escalate" })}
                  >
                    Escalate
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reviewed.length > 0 && (
        <section>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Reviewed ({reviewed.length})</h3>
          <ul className="space-y-2">
            {reviewed.map((r) => (
              <li key={r.reportId} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-foreground">{titleCase(r.reason)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.reportedAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reported by {r.reportedBy.name} · reviewed by {r.reviewedBy?.name ?? "—"} on {formatDateTime(r.reviewedAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
