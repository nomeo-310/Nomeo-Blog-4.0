export type SubscriptionStatusFilter = "all" | "active" | "past_due" | "cancelled" | "expired" | "trialing" | "paused";
export type SubscriptionSortBy = "newest" | "oldest" | "ending_soon";

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface SubscriptionListItem {
  id: string;
  subscriber: PersonRef;
  planName: string;
  status: string;
  interval: string;
  priceAmount: number;
  currency: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  createdAt: string;
}

export interface SubscriptionsListResponse {
  filters: { status: string; search?: string };
  sortBy: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  subscriptions: SubscriptionListItem[];
}

export interface RecentAction {
  id: string;
  action: string;
  details: string;
  adminName: string;
  severity: string;
  status: string;
  reason?: string;
  createdAt: string;
}

export interface PaymentSummary {
  id: string;
  reference: string;
  amount: number;
  amountPaid: number;
  currency: string;
  gatewayStatus: string;
  paidAt: string | null;
  createdAt: string;
}

export interface SubscriptionDetailResponse {
  subscription: {
    id: string;
    status: string;
    interval: string;
    priceAmount: number;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
    cancelledAt: string | null;
    autoRenew: boolean;
    statusHistory: Array<{ status: string; changedAt: string; reason?: string }>;
    createdAt: string;
  };
  subscriber: PersonRef | null;
  plan: { id: string; name: string; interval: string; priceAmount: number } | null;
  payments: PaymentSummary[];
  recentActions: RecentAction[];
}
