"use client";

import Modal from "@/components/ui/modal";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { authClient } from "@/lib/auth-client";
import { useSubscriptionDetail } from "../use-subscription-detail";
import { useCancelSubscription } from "../use-subscription-mutations";
import { SubscriptionStatusBadge } from "./subscription-badges";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { formatMoney, formatDate, formatDateTime, titleCase } from "../utils";

export function SubscriptionDetailModal({ subscriptionId, onClose }: { subscriptionId: string | null; onClose: () => void }) {
  const { data, isLoading } = useSubscriptionDetail(subscriptionId);
  const { data: session } = authClient.useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  // No permission flag is modeled for subscription management, and cancelling
  // a paid subscription is financially significant, so the backend hardcodes
  // this to admin/super_admin — mirrored here as a UI hint only.
  const canCancel = role === "admin" || role === "super_admin";

  const cancel = useCancelSubscription(subscriptionId ?? "");

  return (
    <Modal
      isOpen={!!subscriptionId}
      onClose={onClose}
      size="lg"
      title={data?.subscriber?.name ?? (isLoading ? "Loading…" : "Subscription")}
      description={data?.subscriber?.email}
      primaryAction={subscriptionId ? {
        label: "Download statement",
        onClick: () => window.open(`/api/admin/subscriptions/${subscriptionId}/statement`, "_blank"),
      } : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={3} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <SubscriptionStatusBadge status={data.subscription.status} />
            {data.subscription.autoRenew && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Auto-renews</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-3">
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{data.plan?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Plan</p>
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{formatMoney(data.subscription.priceAmount, data.subscription.currency)}</p>
              <p className="text-xs text-muted-foreground">Price / {data.subscription.interval}</p>
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{formatDate(data.subscription.currentPeriodEnd)}</p>
              <p className="text-xs text-muted-foreground">Period ends</p>
            </div>
          </div>

          {data.subscription.cancelledAt && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              Cancelled on {formatDateTime(data.subscription.cancelledAt)}
            </div>
          )}

          <div>
            <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Payment history</h3>
            {data.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <ul className="space-y-2">
                {data.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <div>
                      <p className="font-mono text-xs text-foreground">{p.reference}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt)} · {titleCase(p.gatewayStatus)}</p>
                    </div>
                    <p className="tabular-nums font-medium text-foreground">{formatMoney(p.amountPaid, p.currency)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canCancel && data.subscription.status !== "cancelled" && (
            <div>
              <h3 className="mb-3 font-heading text-sm font-semibold text-destructive">Danger zone</h3>
              <ReasonActionButton
                label="Cancel subscription" variant="destructive" isLoading={cancel.isPending}
                onConfirm={(reason) => cancel.mutate({ reason: reason! })}
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
