"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreatorEarnings } from "../use-creator-detail";
import { useUpdatePayout } from "../use-creator-mutations";
import { PayoutStatusBadge } from "./creator-badges";
import { formatKobo } from "../utils";
import type { EarningListItem } from "../types";

const STATUS_OPTIONS = [
  { value: "all",        label: "All statuses" },
  { value: "pending",    label: "Pending" },
  { value: "calculated", label: "Calculated" },
  { value: "processing", label: "Processing" },
  { value: "paid",       label: "Paid" },
  { value: "failed",     label: "Failed" },
  { value: "on_hold",    label: "On hold" },
];

function EarningRow({ creatorId, earning, canManagePayouts }: { creatorId: string; earning: EarningListItem; canManagePayouts: boolean }) {
  const [holdNote, setHoldNote] = useState<string | null>(null);
  const updatePayout = useUpdatePayout(creatorId, earning.id);

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{earning.billingPeriod}</span>
        <PayoutStatusBadge status={earning.payoutStatus} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Gross</p>
          <p className="font-medium text-foreground">{formatKobo(earning.grossAmount, earning.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net</p>
          <p className="font-medium text-foreground">{formatKobo(earning.netAmount, earning.currency)}</p>
        </div>
        {earning.payoutModel === "fixed_rate" ? (
          <div>
            <p className="text-xs text-muted-foreground">Completed reads</p>
            <p className="font-medium text-foreground">
              {Math.round(earning.completedReadsCount)} × {formatKobo(earning.ratePerCompletedRead, earning.currency)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">Read share</p>
            <p className="font-medium text-foreground">{Math.round(earning.readMinutesShare * 1000) / 10}%</p>
          </div>
        )}
      </div>
      {earning.payoutModel === "fixed_rate" && earning.payoutScaleFactor < 1 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          Scaled to {Math.round(earning.payoutScaleFactor * 1000) / 10}% — completed reads exceeded this month&apos;s revenue pool.
        </p>
      )}
      {earning.adminNotes && (
        <p className="mt-2 text-xs text-muted-foreground">Note: {earning.adminNotes}</p>
      )}

      {canManagePayouts && (
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {earning.payoutStatus === "on_hold" ? (
            <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatePayout.isPending} onClick={() => updatePayout.mutate({ action: "release" })}>
              Release hold
            </Button>
          ) : earning.payoutStatus !== "paid" && earning.payoutStatus !== "processing" && (
            holdNote === null ? (
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setHoldNote("")}>
                Hold
              </Button>
            ) : (
              <div className="w-full space-y-2 rounded-lg border border-border p-2">
                <input
                  autoFocus
                  value={holdNote}
                  onChange={(e) => setHoldNote(e.target.value)}
                  placeholder="Reason for hold (required)…"
                  className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setHoldNote(null)}>Cancel</Button>
                  <Button
                    type="button" size="sm" variant="outline" className="rounded-full"
                    disabled={!holdNote.trim() || updatePayout.isPending}
                    onClick={() => { updatePayout.mutate({ action: "hold", note: holdNote.trim() }); setHoldNote(null); }}
                  >
                    {updatePayout.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm hold"}
                  </Button>
                </div>
              </div>
            )
          )}
          {earning.payoutStatus === "processing" && (
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              Transfer in progress
            </span>
          )}
          {earning.payoutStatus === "calculated" && (
            earning.payoutRequestedAt ? (
              <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={updatePayout.isPending} onClick={() => updatePayout.mutate({ action: "mark_paid" })}>
                {updatePayout.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Honor payout request"}
              </Button>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Awaiting creator request
              </span>
            )
          )}
        </div>
      )}
    </li>
  );
}

export function CreatorEarningsTab({ creatorId, canManagePayouts }: { creatorId: string; canManagePayouts: boolean }) {
  const [payoutStatus, setPayoutStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCreatorEarnings(creatorId, payoutStatus, page);

  return (
    <div className="space-y-4">
      <Select value={payoutStatus} onValueChange={(v) => { setPayoutStatus(v ?? "all"); setPage(1); }}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent className="p-1">
          {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !data?.earnings.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No earnings records match these filters.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.earnings.map((earning) => (
              <EarningRow key={earning.id} creatorId={creatorId} earning={earning} canManagePayouts={canManagePayouts} />
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} periods
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
