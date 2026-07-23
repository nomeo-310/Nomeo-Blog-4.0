"use client";

import { Button } from "@/components/ui/button";
import { LoungeStatusBadge, KindBadge, AccessTypeBadge } from "./lounge-badges";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { DeleteConfirmPanel } from "@/components/features/delete-confirm-panel";
import { useModerateLounge, useDeleteLounge } from "../use-lounge-mutations";
import { formatCompactNumber, formatDateTime, titleCase } from "../utils";
import type { LoungeDetailResponse } from "../types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function LoungeOverviewTab({
  data, canDelete, onClose,
}: {
  data: LoungeDetailResponse;
  canDelete: boolean;
  onClose: () => void;
}) {
  const { lounge, memberStats, recentActions } = data;
  const moderate = useModerateLounge(lounge.id);
  const remove   = useDeleteLounge(lounge.id, onClose);

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-1.5">
        <KindBadge kind={lounge.kind} />
        <AccessTypeBadge accessType={lounge.accessType} />
        <LoungeStatusBadge status={lounge.status} />
        {lounge.isMuted && (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Muted
          </span>
        )}
      </div>

      {lounge.description && <p className="text-sm text-muted-foreground">{lounge.description}</p>}

      {lounge.isSuspended && lounge.suspensionReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Suspended by {lounge.suspendedBy?.name ?? "an admin"} on {formatDateTime(lounge.suspendedAt)}: {lounge.suspensionReason}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-4">
        <StatBlock label="Members" value={formatCompactNumber(lounge.membersCount)} />
        <StatBlock label="Messages" value={formatCompactNumber(lounge.messagesCount)} />
        <StatBlock label="Banned" value={lounge.bannedMembers.length} />
        <StatBlock label="Pending requests" value={memberStats.pending ?? 0} />
      </div>

      {/* Creator / config */}
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Owner</p>
          {lounge.creator ? (
            <>
              <p className="font-medium text-foreground">{lounge.creator.name}</p>
              <p className="text-xs text-muted-foreground">{lounge.creator.email}</p>
            </>
          ) : (
            <p className="font-medium text-foreground">Platform-owned</p>
          )}
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Configuration</p>
          <p className="font-medium text-foreground">
            {lounge.slowModeSeconds > 0 ? `${lounge.slowModeSeconds}s slow mode` : "No slow mode"}
          </p>
          <p className="text-xs text-muted-foreground">Max {lounge.maxMessageLength} chars/message</p>
        </div>
      </div>

      {lounge.rules.length > 0 && (
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Rules</h3>
          <ul className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            {lounge.rules.map((rule, i) => <li key={i}>{rule}</li>)}
          </ul>
        </div>
      )}

      {/* Moderation actions */}
      <div>
        <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Moderation</h3>
        <div className="flex flex-wrap items-start gap-2">
          {lounge.isSuspended ? (
            <Button type="button" size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ action: "reinstate" })}>
              Reinstate lounge
            </Button>
          ) : (
            <ReasonActionButton
              label="Suspend"
              variant="destructive"
              isLoading={moderate.isPending}
              onConfirm={(reason) => moderate.mutate({ action: "suspend", reason })}
            />
          )}
        </div>
      </div>

      {/* Danger zone */}
      {canDelete && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-destructive">Danger zone</h3>
          <DeleteConfirmPanel
            confirmValue={lounge.name}
            warning="This permanently deletes the lounge, its members, and all messages. This cannot be undone."
            isLoading={remove.isPending}
            onConfirm={({ reason, confirmValue }) => remove.mutate({ reason, confirmName: confirmValue })}
          />
        </div>
      )}

      {/* Recent history */}
      {recentActions.length > 0 && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Recent moderation history</h3>
          <ul className="space-y-2">
            {recentActions.map((a) => (
              <li key={a.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{titleCase(a.action)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">by {a.adminName}{a.reason ? ` — ${a.reason}` : ""}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
