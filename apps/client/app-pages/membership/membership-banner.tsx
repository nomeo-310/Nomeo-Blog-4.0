import type { SubscriptionData } from "@/hooks/use-subscription";

/** Banner shown above the plan layout when the viewer already has an active subscription. */
export function MembershipBanner({ subscription, onManage }: {
  subscription: SubscriptionData;
  onManage: () => void;
}) {
  return (
    <div className="mx-auto mb-10 max-w-5xl rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
      <p className="text-sm font-medium text-foreground">
        You&apos;re a {subscription.interval} member — renews in {subscription.daysUntilRenewal} days.
      </p>
      <button
        onClick={onManage}
        className="mt-2 text-sm font-medium text-primary hover:underline"
      >
        Manage your membership
      </button>
    </div>
  );
}
