"use client";

import { ReasonActionButton } from "@/components/features/reason-action-button";
import { Button } from "@/components/ui/button";
import { CreatorStatusBadge } from "./creator-badges";
import { useModerateCreator } from "../use-creator-mutations";
import { formatCompactNumber, formatDateTime, titleCase } from "../utils";
import type { CreatorDetailResponse } from "../types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function CreatorOverviewTab({
  data, canModerate,
}: {
  data: CreatorDetailResponse;
  canModerate: boolean;
}) {
  const { creator, profile, recentActions } = data;
  const moderate = useModerateCreator(creator.id);

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-1.5">
        <CreatorStatusBadge status={profile?.creatorStatus ?? "active"} />
        {profile?.banStatus !== "active" && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
            {titleCase(profile?.banStatus ?? "")}
          </span>
        )}
      </div>

      {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}

      {profile?.creatorStatus === "suspended" && profile.creatorSuspensionReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Suspended on {formatDateTime(profile.creatorSuspendedAt)}: {profile.creatorSuspensionReason}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-4">
        <StatBlock label="Followers" value={formatCompactNumber(profile?.followersCount ?? 0)} />
        <StatBlock label="Following" value={formatCompactNumber(profile?.followingCount ?? 0)} />
        <StatBlock label="Posts" value={formatCompactNumber(profile?.postsCount ?? 0)} />
        <StatBlock label="Since" value={data.creator.createdAt ? new Date(data.creator.createdAt).getFullYear() : "—"} />
      </div>

      {profile?.creatorTopics && profile.creatorTopics.length > 0 && (
        <div>
          <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Writes about</h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.creatorTopics.map((topic) => (
              <span key={topic} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{topic}</span>
            ))}
          </div>
        </div>
      )}

      {/* Moderation actions */}
      {canModerate && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Moderation</h3>
          <div className="flex flex-wrap items-start gap-2">
            {profile?.creatorStatus === "suspended" ? (
              <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={moderate.isPending} onClick={() => moderate.mutate({ action: "reinstate" })}>
                Reinstate
              </Button>
            ) : (
              <ReasonActionButton
                label="Suspend" variant="destructive" isLoading={moderate.isPending}
                onConfirm={(reason) => moderate.mutate({ action: "suspend", reason })}
              />
            )}
            <ReasonActionButton
              label="Demote to user" variant="destructive" isLoading={moderate.isPending}
              onConfirm={(reason) => moderate.mutate({ action: "demote", reason })}
            />
          </div>
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
