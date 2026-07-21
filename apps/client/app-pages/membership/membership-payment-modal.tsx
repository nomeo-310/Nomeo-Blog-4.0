"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useInitiatePayment, useVerifyPayment } from "@/hooks/use-payments";
import { useSubscription } from "@/hooks/use-subscription";
import type { PlanOption } from "@/hooks/use-plans";
import { MembershipPaymentSummary } from "./membership-payment-summary";
import { MembershipPaymentStatus } from "./membership-payment-status";

/**
 * MembershipPaymentModal
 * ----------------------
 * Drives the subscribe flow for one chosen plan:
 *   initiate → Paystack inline → verify (poll) → activate subscription.
 *
 * The subscription record is created only AFTER payment verifies (POST
 * /api/subscriptions), mirroring the proven flow. No coupons, no free path —
 * every Nomeo plan is paid.
 */

interface Props {
  plan: PlanOption;
  userEmail: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MembershipPaymentModal({ plan, userEmail, userName, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { subscribe, isSubscribing } = useSubscription();

  // react-paystack reads window at module load, which breaks SSR — lazy-load it.
  const [usePaystackPaymentHook, setUsePaystackPaymentHook] = useState<
    typeof import("react-paystack")["usePaystackPayment"] | null
  >(null);
  useEffect(() => {
    import("react-paystack").then((mod) => setUsePaystackPaymentHook(() => mod.usePaystackPayment));
  }, []);

  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [userHasPaid, setUserHasPaid] = useState(false);
  const [paystackOpen, setPaystackOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const hasCompletedRef = useRef(false);

  const { mutate: initiatePayment, isPending: isInitiating } = useInitiatePayment();

  // Initiate on mount + on retry. Only planId is sent; price is server-side.
  useEffect(() => {
    if (!plan.id) return;
    hasCompletedRef.current = false;
    setUserHasPaid(false);

    initiatePayment(
      { planId: plan.id },
      {
        onSuccess: ({ data }) => setPaymentReference(data.reference),
        onError: () => toast.error("Could not prepare payment. Please try again."),
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, plan.id]);

  // Poll verify once the user has interacted with Paystack.
  const verifyQuery = useVerifyPayment(paymentReference ?? "", {
    enabled: !!paymentReference && userHasPaid && !hasCompletedRef.current,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.gatewayStatus;
      if (status === "success" || status === "failed" || status === "abandoned") return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (!verifyQuery.data || hasCompletedRef.current) return;
    const responseRef = verifyQuery.data.data?.reference;
    const status = verifyQuery.data.data?.gatewayStatus;
    if (!paymentReference || responseRef !== paymentReference || !status) return;

    if (status === "success") {
      hasCompletedRef.current = true;
      activate(responseRef);
    } else if (status === "failed" || status === "abandoned") {
      queryClient.removeQueries({ queryKey: ["payments", "verify", responseRef] });
      setUserHasPaid(false);
      setPaymentReference(null);
      setRetryCount((c) => c + 1);
      toast.error(
        status === "abandoned"
          ? "Payment not completed. Click Pay to try again."
          : "Payment failed. Please try again."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyQuery.data, paymentReference]);

  const activate = async (reference: string) => {
    setIsConfirming(true);
    try {
      await subscribe({ planId: plan.id, paystackReference: reference });
      toast.success("Welcome to Nomeo membership!");
      onSuccess();
    } catch {
      toast.error("Payment confirmed but activation failed. Please contact support.");
    } finally {
      setIsConfirming(false);
    }
  };

  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

  const paystackConfig = {
    publicKey: PAYSTACK_PUBLIC_KEY,
    email: userEmail,
    amount: plan.priceAmount,
    currency: "NGN",
    reference: paymentReference ?? "",
    metadata: {
      custom_fields: [
        { display_name: "Plan", variable_name: "plan", value: plan.name },
        { display_name: "Interval", variable_name: "interval", value: plan.interval },
        { display_name: "Customer", variable_name: "customer", value: userName },
      ],
    },
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const initializePayment = usePaystackPaymentHook?.(paystackConfig) ?? null;

  const isPreparingReference = (isInitiating || !usePaystackPaymentHook) && !paymentReference;
  const isAwaitingConfirmation = userHasPaid && (isConfirming || isSubscribing);
  const canPay =
    !!PAYSTACK_PUBLIC_KEY &&
    !!paymentReference &&
    !!initializePayment &&
    !isInitiating &&
    !isConfirming &&
    !isSubscribing &&
    !hasCompletedRef.current;

  const handlePayClick = () => {
    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error("Payment isn't configured. Please contact support.");
      return;
    }
    if (!canPay || !initializePayment) return;
    setPaystackOpen(true);
    initializePayment({
      onSuccess: (r: { reference: string }) => {
        setPaystackOpen(false);
        setUserHasPaid(true);
        if (r.reference && r.reference !== paymentReference) setPaymentReference(r.reference);
      },
      onClose: () => {
        setPaystackOpen(false);
        setUserHasPaid(true); // poll either way — verify resolves it
      },
    });
  };

  const priceDisplay = `₦${(plan.priceAmount / 100).toLocaleString("en-NG")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      {/* Keep the dim backdrop; hide only the card while Paystack's iframe is open
          so its form floats over the dim instead of a white page. */}
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-7",
          paystackOpen && "invisible"
        )}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-heading text-lg font-bold text-card-foreground">Complete membership</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <MembershipPaymentSummary plan={plan} priceDisplay={priceDisplay} />

        <MembershipPaymentStatus
          isAwaitingConfirmation={isAwaitingConfirmation}
          isPreparingReference={isPreparingReference}
          retryCount={retryCount}
        />

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePayClick}
            disabled={!canPay}
            className="flex-1 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPreparingReference ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Preparing…</span>
            ) : isAwaitingConfirmation ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Confirming…</span>
            ) : retryCount > 0 ? (
              `Try again — Pay ${priceDisplay}`
            ) : (
              `Pay ${priceDisplay}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}