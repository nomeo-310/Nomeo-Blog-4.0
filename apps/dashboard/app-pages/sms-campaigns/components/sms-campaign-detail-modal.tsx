"use client";

import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { useSmsCampaignDetail } from "../use-sms-campaign-detail";
import { useSendSmsCampaign, useCancelSmsCampaign, useDeleteSmsCampaign } from "../use-sms-campaign-mutations";
import { SmsCampaignStatusBadge, SmsAudienceBadge } from "./sms-campaign-badges";
import { formatDateTime, titleCase } from "../utils";

export function SmsCampaignDetailModal({ campaignId, onClose }: { campaignId: string | null; onClose: () => void }) {
  const { data, isLoading } = useSmsCampaignDetail(campaignId);
  const send = useSendSmsCampaign(campaignId ?? "");
  const cancel = useCancelSmsCampaign(campaignId ?? "");
  const remove = useDeleteSmsCampaign(campaignId ?? "", onClose);

  return (
    <Modal
      isOpen={!!campaignId}
      onClose={onClose}
      size="xl"
      title={data?.campaign.title ?? (isLoading ? "Loading…" : "SMS campaign")}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={4} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <SmsAudienceBadge audience={data.campaign.audience} />
            <SmsCampaignStatusBadge status={data.campaign.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-4">
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{data.campaign.recipients.total}</p>
              <p className="text-xs text-muted-foreground">Recipients</p>
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{data.campaign.recipients.successful}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{data.campaign.recipients.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{data.campaign.externalRecipients.length}</p>
              <p className="text-xs text-muted-foreground">Extra recipients</p>
            </div>
          </div>

          {data.campaign.status === "sending" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
              Sending in progress — a background job drains this queue in small batches every few minutes. This view refreshes automatically.
            </div>
          )}

          <div>
            <h3 className="mb-2 font-heading text-sm font-semibold text-foreground">Message preview</h3>
            <div className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-4 text-sm text-foreground">
              {data.campaign.message}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Actions</h3>
            <div className="flex flex-wrap items-center gap-2">
              {data.campaign.status === "draft" && (
                <Button type="button" size="sm" className="rounded-full" disabled={send.isPending} onClick={() => send.mutate()}>
                  Send campaign
                </Button>
              )}
              {(data.campaign.status === "draft" || data.campaign.status === "sending") && (
                <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
                  Cancel
                </Button>
              )}
              {data.campaign.status === "draft" && (
                <Button type="button" size="sm" variant="destructive" className="rounded-full" disabled={remove.isPending} onClick={() => remove.mutate()}>
                  Delete draft
                </Button>
              )}
              {!["draft", "sending"].includes(data.campaign.status) && (
                <p className="text-sm text-muted-foreground">This campaign is in a terminal state — no further actions apply.</p>
              )}
            </div>
          </div>

          {data.recentLogs.length > 0 && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Recent sends</h3>
              <ul className="space-y-2">
                {data.recentLogs.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div>
                      <p className="text-foreground">{l.name ? `${l.name} · ` : ""}{l.phone}</p>
                      {l.error && <p className="text-xs text-destructive">{l.error}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{titleCase(l.status)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Created {formatDateTime(data.campaign.createdAt)} by {data.campaign.createdBy?.name ?? "Unknown"}</p>
        </div>
      )}
    </Modal>
  );
}
