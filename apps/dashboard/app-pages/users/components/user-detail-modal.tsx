"use client";

import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { DeleteConfirmPanel } from "@/components/features/delete-confirm-panel";
import { authClient } from "@/lib/auth-client";
import { useUserDetail } from "../use-user-detail";
import { useModerateUser, useDeleteUser } from "../use-user-mutations";
import { TempBanPanel } from "./temp-ban-panel";
import { BanStatusBadge } from "./user-badges";
import { formatCompactNumber, formatDateTime, titleCase } from "../utils";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function UserDetailModal({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data, isLoading } = useUserDetail(userId);
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // canIssuePermanentBan/canShadowBan/canLiftBan/canDeleteUserAccount default true for
  // admin+super_admin only — the backend is the real authority (permissions are
  // customizable per-admin), this just decides whether to show the button at all.
  const isAnAdminOrAbove = role === "admin" || role === "super_admin";

  const moderate = useModerateUser(userId ?? "");
  const remove   = useDeleteUser(userId ?? "", onClose);

  return (
    <Modal
      isOpen={!!userId}
      onClose={onClose}
      size="xl"
      title={data?.user.name ?? (isLoading ? "Loading…" : "User")}
      description={data ? data.user.email : undefined}
      primaryAction={userId ? {
        label: "Download summary",
        onClick: () => window.open(`/api/admin/users/${userId}/export`, "_blank"),
      } : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={5} />
      ) : (
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1.5">
            <BanStatusBadge status={data.profile?.banStatus ?? "active"} />
            {data.user.emailVerified && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Email verified</span>
            )}
            {data.profile?.creatorStatus === "suspended" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Creator suspended
              </span>
            )}
          </div>

          {data.profile?.bio && <p className="text-sm text-muted-foreground">{data.profile.bio}</p>}

          {data.profile && data.profile.banStatus !== "active" && data.profile.banReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {titleCase(data.profile.banStatus)} on {formatDateTime(data.profile.bannedAt)}: {data.profile.banReason}
              {data.profile.banExpiresAt && ` (until ${formatDateTime(data.profile.banExpiresAt)})`}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-5">
            <StatBlock label="Followers" value={formatCompactNumber(data.profile?.followersCount ?? 0)} />
            <StatBlock label="Following" value={formatCompactNumber(data.profile?.followingCount ?? 0)} />
            <StatBlock label="Posts" value={formatCompactNumber(data.profile?.postsCount ?? 0)} />
            <StatBlock label="Saved posts" value={formatCompactNumber(data.profile?.savedPostsCount ?? 0)} />
            <StatBlock label="Free reads left" value={data.profile?.freeReadsRemaining ?? 0} />
          </div>

          {/* Details */}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Account</p>
              <p className="font-medium text-foreground">@{data.profile?.username ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Joined {formatDateTime(data.user.createdAt)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Subscription</p>
              {data.subscription ? (
                <>
                  <p className="font-medium text-foreground">{titleCase(data.subscription.status)} · {titleCase(data.subscription.interval)}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.subscription.autoRenew ? "Renews" : "Ends"} {formatDateTime(data.subscription.currentPeriodEnd)}
                  </p>
                </>
              ) : (
                <p className="font-medium text-foreground">No active subscription</p>
              )}
            </div>
          </div>

          {/* Moderation actions */}
          <div>
            <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Moderation</h3>
            <div className="flex flex-wrap items-start gap-2">
              {!data.user.emailVerified && (
                <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={moderate.isPending} onClick={() => moderate.mutate({ action: "verify_email" })}>
                  Mark email verified
                </Button>
              )}
              {(data.profile?.banStatus ?? "active") === "active" ? (
                <>
                  <ReasonActionButton
                    label="Warn" variant="outline" isLoading={moderate.isPending}
                    onConfirm={(reason) => moderate.mutate({ action: "warn", reason })}
                  />
                  <TempBanPanel
                    isLoading={moderate.isPending}
                    onConfirm={({ reason, banExpiresAt }) => moderate.mutate({ action: "temp_ban", reason, banExpiresAt })}
                  />
                  {isAnAdminOrAbove && (
                    <>
                      <ReasonActionButton
                        label="Permanent ban" variant="destructive" isLoading={moderate.isPending}
                        onConfirm={(reason) => moderate.mutate({ action: "permanent_ban", reason })}
                      />
                      <ReasonActionButton
                        label="Shadow ban" variant="outline" isLoading={moderate.isPending}
                        onConfirm={(reason) => moderate.mutate({ action: "shadow_ban", reason })}
                      />
                    </>
                  )}
                </>
              ) : (
                isAnAdminOrAbove && (
                  <ReasonActionButton
                    label="Unban" variant="outline" requireReason={false} isLoading={moderate.isPending}
                    onConfirm={(reason) => moderate.mutate({ action: "unban", reason })}
                  />
                )
              )}
            </div>
          </div>

          {/* Danger zone */}
          {isAnAdminOrAbove && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-destructive">Danger zone</h3>
              <DeleteConfirmPanel
                confirmValue={data.user.email}
                warning="This permanently deletes the account. Their posts and comments remain, attributed to a deleted user. This cannot be undone."
                isLoading={remove.isPending}
                onConfirm={({ reason, confirmValue }) => remove.mutate({ reason, confirmEmail: confirmValue })}
              />
            </div>
          )}

          {/* Recent history */}
          {data.recentActions.length > 0 && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Recent moderation history</h3>
              <ul className="space-y-2">
                {data.recentActions.map((a) => (
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
      )}
    </Modal>
  );
}
