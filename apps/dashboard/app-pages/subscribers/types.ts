export type SubscriberStatusFilter = "all" | "confirmed" | "unconfirmed" | "unsubscribed";
export type SubscriberSourceFilter = "all" | "landing_form" | "footer_form" | "onboarding" | "import";

export interface SubscriberListItem {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  userId: string | null;
  isConfirmed: boolean;
  confirmedAt: string | null;
  isUnsubscribed: boolean;
  unsubscribedAt: string | null;
  source: string;
  createdAt: string;
}

export interface SubscribersListResponse {
  filters: { status: string; source: string; search?: string };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  subscribers: SubscriberListItem[];
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

export interface SubscriberDetailResponse {
  subscriber: SubscriberListItem;
  recentActions: RecentAction[];
}
