"use client";

import Modal from "@/components/ui/modal";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { DeleteConfirmPanel } from "@/components/features/delete-confirm-panel";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { authClient } from "@/lib/auth-client";
import { useSubscriberDetail } from "../use-subscriber-detail";
import { useUnsubscribeSubscriber, useDeleteSubscriber } from "../use-subscriber-mutations";
import { formatDateTime, titleCase } from "../utils";

export function SubscriberDetailModal({ subscriberId, onClose }: { subscriberId: string | null; onClose: () => void }) {
  const { data, isLoading } = useSubscriberDetail(subscriberId);
  const { data: session } = authClient.useSession();
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "super_admin";

  const unsubscribe = useUnsubscribeSubscriber(subscriberId ?? "");
  const remove = useDeleteSubscriber(subscriberId ?? "", onClose);

  return (
    <Modal
      isOpen={!!subscriberId}
      onClose={onClose}
      size="lg"
      title={data?.subscriber.name || data?.subscriber.email || (isLoading ? "Loading…" : "Subscriber")}
      description={data?.subscriber.name ? data.subscriber.email : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={2} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium text-foreground">
                {data.subscriber.isUnsubscribed ? "Unsubscribed" : data.subscriber.isConfirmed ? "Confirmed" : "Unconfirmed"}
              </p>
              {data.subscriber.unsubscribedAt && <p className="text-xs text-muted-foreground">on {formatDateTime(data.subscriber.unsubscribedAt)}</p>}
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="font-medium text-foreground">{titleCase(data.subscriber.source)}</p>
            </div>
            {data.subscriber.phone && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground">{data.subscriber.phone}</p>
              </div>
            )}
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Subscribed since</p>
              <p className="font-medium text-foreground">{formatDateTime(data.subscriber.createdAt)}</p>
            </div>
          </div>

          {!data.subscriber.isUnsubscribed && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Actions</h3>
              <ReasonActionButton
                label="Unsubscribe" variant="outline" requireReason={false} isLoading={unsubscribe.isPending}
                onConfirm={(reason) => unsubscribe.mutate({ reason })}
              />
            </div>
          )}

          {isSuperAdmin && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-destructive">Danger zone</h3>
              <DeleteConfirmPanel
                confirmValue={data.subscriber.email}
                warning="This permanently deletes the subscriber record. This cannot be undone."
                isLoading={remove.isPending}
                onConfirm={({ reason, confirmValue }) => remove.mutate({ reason, confirmEmail: confirmValue })}
              />
            </div>
          )}

          {data.recentActions.length > 0 && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">History</h3>
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
