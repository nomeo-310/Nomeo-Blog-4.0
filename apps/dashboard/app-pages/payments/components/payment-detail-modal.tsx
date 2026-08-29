"use client";

import { Download } from "lucide-react";
import Modal from "@/components/ui/modal";
import { ModalContentSkeleton } from "@/components/features/modal-content-skeleton";
import { usePaymentDetail } from "../use-payment-detail";
import { PaymentStatusBadge } from "./payment-badges";
import { formatMoney, formatDateTime, titleCase } from "../utils";

export function PaymentDetailModal({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) {
  const { data, isLoading } = usePaymentDetail(paymentId);

  return (
    <Modal
      isOpen={!!paymentId}
      onClose={onClose}
      size="lg"
      title={data?.payment.reference ?? (isLoading ? "Loading…" : "Payment")}
      description={data?.payer ? `${data.payer.name} · ${data.payer.email}` : undefined}
      primaryAction={paymentId ? {
        label: "Download receipt",
        onClick: () => window.open(`/api/admin/payments/${paymentId}/receipt`, "_blank"),
      } : undefined}
    >
      {isLoading || !data ? (
        <ModalContentSkeleton statCount={3} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <PaymentStatusBadge status={data.payment.gatewayStatus} />
            {data.payment.channel && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{titleCase(data.payment.channel)}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-3">
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{formatMoney(data.payment.amount, data.payment.currency)}</p>
              <p className="text-xs text-muted-foreground">Amount</p>
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{formatMoney(data.payment.amountPaid, data.payment.currency)}</p>
              <p className="text-xs text-muted-foreground">Amount paid</p>
            </div>
            <div>
              <p className="font-heading text-lg font-bold text-foreground">{data.plan?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Plan</p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="font-mono text-xs font-medium text-foreground">{data.payment.reference}</p>
              {data.payment.paystackReference && <p className="mt-1 font-mono text-xs text-muted-foreground">Paystack: {data.payment.paystackReference}</p>}
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Dates</p>
              <p className="font-medium text-foreground">Initiated {formatDateTime(data.payment.createdAt)}</p>
              {data.payment.paidAt && <p className="text-xs text-muted-foreground">Paid {formatDateTime(data.payment.paidAt)}</p>}
            </div>
            {data.payment.cardBank && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Card</p>
                <p className="font-medium text-foreground">{data.payment.cardType} •••• {data.payment.cardLast4}</p>
                <p className="text-xs text-muted-foreground">{data.payment.cardBank}</p>
              </div>
            )}
            {data.subscription && (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Subscription</p>
                <p className="font-medium text-foreground">{titleCase(data.subscription.status)}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Download className="h-3.5 w-3.5" />
            Use the &quot;Download receipt&quot; button above to export this payment as a PDF.
          </div>

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
                    <p className="mt-0.5 text-xs text-muted-foreground">by {a.adminName}</p>
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
