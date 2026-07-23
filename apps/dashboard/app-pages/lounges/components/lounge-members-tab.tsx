"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLoungeMembers } from "../use-lounge-detail";
import { useLoungeMemberAction } from "../use-lounge-mutations";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { formatDateTime, titleCase } from "../utils";

const STATUS_OPTIONS = [
  { value: "all",      label: "All statuses" },
  { value: "pending",  label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "removed",  label: "Removed" },
];

export function LoungeMembersTab({ loungeId }: { loungeId: string }) {
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLoungeMembers(loungeId, status, page);
  const memberAction = useLoungeMemberAction(loungeId);

  return (
    <div className="space-y-4">
      <Select value={status} onValueChange={(v) => { if (v) { setStatus(v); setPage(1); } }}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent className="p-1">
          {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : !data?.members.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No members match this filter.</p>
      ) : (
        <div className="space-y-2">
          {data.members.map((m) => (
            <div key={m.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="capitalize">{titleCase(m.status)} · {titleCase(m.role)}</p>
                  {m.isBanned && <p className="font-medium text-destructive">Banned</p>}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {m.lastMessageAt ? `Last message ${formatDateTime(m.lastMessageAt)}` : `Requested ${formatDateTime(m.requestedAt)}`}
                </p>
                {m.isBanned ? (
                  <Button
                    type="button" size="sm" variant="outline"
                    disabled={memberAction.isPending}
                    onClick={() => memberAction.mutate({ memberId: m.id, action: "unban" })}
                  >
                    Unban
                  </Button>
                ) : (
                  <ReasonActionButton
                    label="Ban"
                    variant="destructive"
                    isLoading={memberAction.isPending}
                    onConfirm={(reason) => memberAction.mutate({ memberId: m.id, action: "ban", reason })}
                  />
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} members
            </p>
            <div className="flex items-center gap-1.5">
              <Button type="button" size="icon-sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button" size="icon-sm" variant="outline"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
