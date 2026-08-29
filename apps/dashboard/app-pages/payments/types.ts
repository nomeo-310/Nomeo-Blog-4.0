export type PaymentStatusFilter = "all" | "pending" | "success" | "failed" | "abandoned" | "reversed";
export type PaymentSortBy = "newest" | "oldest" | "amount_high" | "amount_low";

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface PaymentListItem {
  id: string;
  reference: string;
  amount: number;
  amountPaid: number;
  currency: string;
  gatewayStatus: string;
  channel: string | null;
  payer: PersonRef;
  planName: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentsListResponse {
  filters: { status: string; search?: string; dateFrom?: string | null; dateTo?: string | null };
  sortBy: string;
  summary: { totalAmount: number; successCount: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  payments: PaymentListItem[];
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

export interface PaymentDetailResponse {
  payment: {
    id: string;
    reference: string;
    paystackReference: string | null;
    amount: number;
    amountPaid: number;
    currency: string;
    gatewayStatus: string;
    gatewayResponse: string | null;
    channel: string | null;
    ipAddress: string | null;
    cardType: string | null;
    cardLast4: string | null;
    cardBank: string | null;
    paidAt: string | null;
    createdAt: string;
  };
  payer: PersonRef | null;
  plan: { id: string; name: string; interval: string } | null;
  subscription: { id: string; status: string; currentPeriodStart: string; currentPeriodEnd: string } | null;
  recentActions: RecentAction[];
}
