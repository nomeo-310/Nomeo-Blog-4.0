"use client";

import { Button } from "@/components/ui/button";
import { useReportAction } from "../use-post-mutations";
import { formatDateTime, titleCase } from "../utils";
import type { ReportDetail } from "../types";

export function PostReportsTab({ postId, reports }: { postId: string; reports: ReportDetail[] }) {
  const reportAction = useReportAction(postId);

  const pending  = reports.filter((r) => !r.reviewed);
  const reviewed = reports.filter((r) => r.reviewed);

  if (reports.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No reports have been filed on this post.</p>;
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Open reports ({pending.length})</h3>
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-foreground">{titleCase(r.reason)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.reportedAt)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Reported by {r.reportedBy.name} ({r.reportedBy.email})</p>
                {r.details && <p className="mt-1.5 text-sm text-foreground">{r.details}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button" size="sm" variant="outline" className={'rounded-full'}
                    disabled={reportAction.isPending}
                    onClick={() => reportAction.mutate({ reportId: r.id, action: "review" })}
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    type="button" size="sm" variant="outline" className={'rounded-full'}
                    disabled={reportAction.isPending}
                    onClick={() => reportAction.mutate({ reportId: r.id, action: "dismiss" })}
                  >
                    Dismiss
                  </Button>
                  <Button
                    type="button" size="sm" variant="destructive" className={'rounded-full'}
                    disabled={reportAction.isPending}
                    onClick={() => reportAction.mutate({ reportId: r.id, action: "escalate" })}
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
              <li key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm">
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
