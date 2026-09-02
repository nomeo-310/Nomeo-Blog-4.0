"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/features/bulk-action-bar";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { useApplicationsList } from "./use-applications-list";
import { useBulkReviewApplications } from "./use-application-mutations";
import { ApplicationCard } from "./components/application-card";
import type { ApplicationStatusFilter } from "./types";

const STATUS_TABS: { key: ApplicationStatusFilter; label: string }[] = [
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all",      label: "All" },
];

export default function ApplicationsPage() {
  const [status, setStatus] = useState<ApplicationStatusFilter>("pending");
  const [page, setPage]     = useState(1);
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // canApproveCreatorApplication/canRejectCreatorApplication default true for
  // admin+super_admin only — the backend is the real authority.
  const canReview = role === "admin" || role === "super_admin";

  const bulk = useBulkSelection();

  const { data, isLoading, isFetching, refetch } = useApplicationsList({ status, page, limit: 20 });
  const bulkReview = useBulkReviewApplications(bulk.clear);

  // Bulk review only makes sense against pending applications, and only
  // earns its keep once there's more than one to act on at a time —
  // otherwise the per-card Approve/Reject buttons already cover it.
  const pendingIds = status === "pending" ? (data?.applications.map((a) => a.id) ?? []) : [];
  const canBulkSelect = canReview && status === "pending" && pendingIds.length > 1;
  const allSelected = canBulkSelect && pendingIds.every((id) => bulk.selected.has(id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Creator applications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Review requests from readers who want to become creators.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setStatus(t.key); setPage(1); bulk.clear(); }}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              status === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bulk actions — only once there's more than one pending application to act on */}
      {canBulkSelect && (
        <BulkActionBar count={bulk.count} onClear={bulk.clear}>
          <Button
            type="button" size="sm" variant="outline" className="rounded-full"
            disabled={bulkReview.isPending}
            onClick={() => bulkReview.mutate({ ids: bulk.ids, action: "approve" })}
          >
            Approve
          </Button>
          <ReasonActionButton
            label="Reject" variant="destructive" isLoading={bulkReview.isPending}
            onConfirm={(note) => bulkReview.mutate({ ids: bulk.ids, action: "reject", note })}
          />
        </BulkActionBar>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : !data?.applications.length ? (
        <p className="py-14 text-center text-sm text-muted-foreground">No applications match this filter.</p>
      ) : (
        <>
          {canBulkSelect && (
            <label className="flex w-fit items-center gap-2 text-xs font-medium text-muted-foreground">
              <Checkbox checked={allSelected} onCheckedChange={() => bulk.toggleAll(pendingIds)} aria-label="Select all" />
              Select all
            </label>
          )}
          <ul className={cn("space-y-3", isFetching && "opacity-60 transition-opacity")}>
            {data.applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                canReview={canReview}
                selectable={canBulkSelect}
                selected={bulk.selected.has(application.id)}
                onToggle={bulk.toggle}
              />
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} applications
            </p>
            <div className="flex items-center gap-1.5">
              <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
