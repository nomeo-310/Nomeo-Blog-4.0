"use client";

import { useState } from "react";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useReviewApplication } from "../use-application-mutations";
import type { ApplicationListItem } from "../types";

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
};

function formatDateTime(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function ApplicationCard({
  application, canReview, selectable = false, selected = false, onToggle,
}: {
  application: ApplicationListItem;
  canReview: boolean;
  /** Only offered when there's more than one reviewable application in the list. */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const review = useReviewApplication(application.id);

  return (
    <li className={cn("rounded-xl border border-border p-4", selectable && selected && "border-primary/40 bg-primary/5")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggle?.(application.id)}
              aria-label={`Select application from ${application.applicant.name}`}
              className="mt-0.5"
            />
          )}
          <div>
            <p className="font-medium text-foreground">{application.applicant.name}</p>
            <p className="text-xs text-muted-foreground">{application.applicant.email}</p>
          </div>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLES[application.status] ?? "bg-muted text-muted-foreground")}>
          {application.status}
        </span>
      </div>

      {application.writingTopics && (
        <p className="mt-2 text-sm text-foreground"><span className="text-muted-foreground">Writes about:</span> {application.writingTopics}</p>
      )}

      <p className={cn("mt-2 text-sm text-foreground", !expanded && "line-clamp-2")}>{application.motivation}</p>

      {expanded && (
        <div className="mt-2 space-y-2">
          {application.portfolioLinks && (
            <p className="text-sm text-foreground"><span className="text-muted-foreground">Portfolio:</span> {application.portfolioLinks}</p>
          )}
          {application.sampleContent && (
            <div className="rounded-lg bg-muted/60 p-3 text-sm text-foreground">{application.sampleContent}</div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-1.5 text-xs font-medium text-primary hover:underline"
      >
        {expanded ? "Show less" : "Show more"}
      </button>

      {application.status !== "pending" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Reviewed by {application.reviewedBy?.name ?? "an admin"} on {formatDateTime(application.reviewedAt)}
          {application.reviewNote ? ` — ${application.reviewNote}` : ""}
        </p>
      )}

      {application.status === "pending" && canReview && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={review.isPending} onClick={() => review.mutate({ action: "approve" })}>
            Approve
          </Button>
          <ReasonActionButton
            label="Reject" variant="destructive" isLoading={review.isPending}
            onConfirm={(note) => review.mutate({ action: "reject", note })}
          />
        </div>
      )}
    </li>
  );
}
