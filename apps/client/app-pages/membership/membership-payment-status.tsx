import { Loader2 } from "lucide-react";

/** Inline status banners for the payment modal — confirming vs. preparing a session. */
export function MembershipPaymentStatus({ isAwaitingConfirmation, isPreparingReference, retryCount }: {
  isAwaitingConfirmation: boolean;
  isPreparingReference: boolean;
  retryCount: number;
}) {
  return (
    <>
      {isAwaitingConfirmation && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          Confirming your payment… please don&apos;t close this window.
        </div>
      )}
      {isPreparingReference && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          {retryCount > 0 ? "Preparing a new payment session…" : "Preparing payment…"}
        </div>
      )}
    </>
  );
}
