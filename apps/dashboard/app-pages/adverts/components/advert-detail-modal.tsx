"use client";

import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { DeleteConfirmPanel } from "@/components/features/delete-confirm-panel";
import { authClient } from "@/lib/auth-client";
import { useAdvertDetail } from "../use-advert-detail";
import { useModerateAdvert, useDeleteAdvert, useUpdateAdvert } from "../use-advert-mutations";
import { AdvertStatusBadge, TypeBadge } from "./advert-badges";
import { placementOptionsForPost } from "../placement-options";
import { formatCompactNumber, formatDateTime, formatKobo, formatPct, titleCase } from "../utils";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function AdvertDetailModal({ advertId, onClose }: { advertId: string | null; onClose: () => void }) {
  const { data, isLoading } = useAdvertDetail(advertId);
  const { data: session } = authClient.useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";

  const moderate = useModerateAdvert(advertId ?? "");
  const update   = useUpdateAdvert(advertId ?? "");
  const remove   = useDeleteAdvert(advertId ?? "", onClose);

  return (
    <Modal
      isOpen={!!advertId}
      onClose={onClose}
      size="xl"
      title={data?.advert.title ?? (isLoading ? "Loading…" : "Advert")}
      description={data ? `by ${data.advert.createdBy.name}` : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={4} />
      ) : (
        <div className="space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge type={data.advert.type} />
            <AdvertStatusBadge status={data.advert.status} />
            {data.advert.billable && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Billable{data.advert.billing ? ` · ${titleCase(data.advert.billing.status)}` : ""}
              </span>
            )}
          </div>

          {data.advert.body && <p className="text-sm text-muted-foreground">{data.advert.body}</p>}

          {data.advert.status === "rejected" && data.advert.reviewNote && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              Rejected by {data.advert.reviewedBy?.name ?? "an admin"} on {formatDateTime(data.advert.reviewedAt)}: {data.advert.reviewNote}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-4">
            <StatBlock label="Impressions" value={formatCompactNumber(data.advert.metrics.impressions)} />
            <StatBlock label="Clicks" value={formatCompactNumber(data.advert.metrics.clicks)} />
            <StatBlock label="CTR" value={formatPct(data.advert.ctr)} />
            <StatBlock label="Unique viewers" value={formatCompactNumber(data.impressionStats.uniqueViewers)} />
          </div>

          {/* Details */}
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Created by</p>
              <p className="font-medium text-foreground">{data.advert.createdBy.name}</p>
              <p className="text-xs text-muted-foreground">{data.advert.createdBy.email}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Schedule</p>
              <p className="font-medium text-foreground">
                {data.advert.startAt ? formatDateTime(data.advert.startAt) : "Starts immediately"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.advert.endAt ? `Ends ${formatDateTime(data.advert.endAt)}` : "No end date"}
              </p>
            </div>
            {data.advert.advertiserName && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Advertiser</p>
                <p className="font-medium text-foreground">{data.advert.advertiserName}</p>
                {data.advert.advertiserContact && <p className="text-xs text-muted-foreground">{data.advert.advertiserContact}</p>}
              </div>
            )}
            {data.advert.post && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Boosted post</p>
                <p className="font-medium text-foreground">{data.advert.post.title}</p>
              </div>
            )}
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="font-medium text-foreground">Priority {data.advert.priority} · Weight {data.advert.weight}</p>
              <p className="text-xs text-muted-foreground">
                Audience: {titleCase(data.advert.targeting.audience)}
              </p>
            </div>
            {data.advert.billing && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Billing</p>
                <p className="font-medium text-foreground">{formatKobo(data.advert.billing.amount)}</p>
                <p className="text-xs text-muted-foreground">{titleCase(data.advert.billing.status)}</p>
              </div>
            )}
          </div>

          {/* Placement */}
          <div className="space-y-1.5">
            <Label htmlFor="advert-placement-select">Placement</Label>
            <Select
              value={data.advert.placement}
              onValueChange={(placement) => { if (placement) update.mutate({ placement }); }}
            >
              <SelectTrigger id="advert-placement-select" className="w-56" disabled={update.isPending}><SelectValue /></SelectTrigger>
              <SelectContent className="p-1">
                {placementOptionsForPost(!!data.advert.post).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {!data.advert.post && (
              <p className="text-xs text-muted-foreground">
                Hero isn&apos;t available here — it requires a post attached to the advert. This {titleCase(data.advert.type)} advert doesn&apos;t have one.
              </p>
            )}
          </div>

          {/* Lifecycle actions */}
          <div>
            <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Moderation</h3>
            <div className="flex flex-wrap items-start gap-2">
              {data.advert.status === "pending_review" && (
                <>
                  <Button type="button" size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ action: "approve" })} className={'rounded-full'}>
                    Approve
                  </Button>
                  <ReasonActionButton
                    label="Reject" variant="destructive" isLoading={moderate.isPending}
                    onConfirm={(reviewNote) => moderate.mutate({ action: "reject", reviewNote })}
                  />
                </>
              )}
              {(data.advert.status === "active" || data.advert.status === "scheduled") && (
                <>
                  <ReasonActionButton
                    label="Pause" variant="outline" requireReason={false} isLoading={moderate.isPending}
                    onConfirm={(reason) => moderate.mutate({ action: "pause", reason })}
                  />
                  <ReasonActionButton
                    label="Complete" variant="outline" requireReason={false} isLoading={moderate.isPending}
                    onConfirm={(reason) => moderate.mutate({ action: "complete", reason })}
                  />
                </>
              )}
              {data.advert.status === "paused" && (
                <>
                  <Button type="button" size="sm" variant="outline" disabled={moderate.isPending} onClick={() => moderate.mutate({ action: "resume" })}>
                    Resume
                  </Button>
                  <ReasonActionButton
                    label="Complete" variant="outline" requireReason={false} isLoading={moderate.isPending}
                    onConfirm={(reason) => moderate.mutate({ action: "complete", reason })}
                  />
                </>
              )}
              {(data.advert.status === "rejected" || data.advert.status === "completed") && (
                <p className="text-sm text-muted-foreground">This advert is in a terminal state — no further lifecycle actions apply.</p>
              )}
              {data.advert.status === "draft" && (
                <p className="text-sm text-muted-foreground">This advert hasn&apos;t been submitted for review yet.</p>
              )}
            </div>
          </div>

          {/* Danger zone */}
          {isSuperAdmin && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-destructive">Danger zone</h3>
              <DeleteConfirmPanel
                confirmValue={data.advert.title}
                warning="This permanently deletes the advert and its impression records. This cannot be undone."
                isLoading={remove.isPending}
                onConfirm={({ reason, confirmValue }) => remove.mutate({ reason, confirmTitle: confirmValue })}
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
