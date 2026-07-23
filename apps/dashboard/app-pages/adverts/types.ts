export type AdvertTypeFilter   = "all" | "sponsored" | "house" | "promoted_post" | "creator_promo";
export type AdvertStatusFilter = "all" | "draft" | "pending_review" | "approved" | "rejected" | "scheduled" | "active" | "paused" | "completed";
export type AdvertPlacementFilter = "all" | "hero" | "feed_card" | "in_article" | "notification_banner" | "modal_popup";
export type AdvertSortBy = "newest" | "oldest" | "most_impressions" | "most_clicks" | "priority";

export interface PersonRef {
  id:    string;
  name:  string;
  email: string;
}

export interface AdvertMetrics {
  impressions: number;
  clicks: number;
  uniqueImpressions: number;
}

export interface AdvertListItem {
  id: string;
  type: string;
  placement: string;
  status: string;
  title: string;
  createdBy: PersonRef;
  creatorId: string | null;
  postId: string | null;
  billable: boolean;
  billingStatus: string | null;
  audience: string;
  priority: number;
  weight: number;
  metrics: AdvertMetrics;
  ctr: number;
  startAt?: string;
  endAt?: string;
  createdAt: string;
}

export interface AdvertsListResponse {
  filters: {
    type: string; status: string; placement: string;
    billable: string | null; createdBy: string | null; search?: string;
  };
  sortBy: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  adverts: AdvertListItem[];
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

export interface AdvertTargeting {
  topics: string[];
  audience: string;
  locations: string[];
}

export interface AdvertBilling {
  amount: number;
  currency: string;
  status: string;
  providerRef?: string;
  paidAt?: string;
}

export interface AdvertDetailResponse {
  advert: {
    id: string; type: string; placement: string; status: string;
    title: string; body?: string;
    image: { url: string; publicId: string } | null;
    ctaLabel?: string; ctaUrl?: string;
    createdBy: PersonRef;
    requiresReview: boolean;
    submittedAt?: string;
    reviewedBy: PersonRef | null;
    reviewedAt?: string;
    reviewNote?: string;
    advertiserName?: string; advertiserContact?: string;
    creator: PersonRef | null;
    post: { id: string; title: string; slug: string } | null;
    targeting: AdvertTargeting;
    startAt?: string; endAt?: string;
    priority: number; weight: number;
    maxImpressionsPerUser: number;
    dismissBehavior: string; popupDelaySeconds: number;
    billable: boolean; billing: AdvertBilling | null;
    metrics: AdvertMetrics;
    ctr: number;
    createdAt: string; updatedAt: string;
  };
  impressionStats: {
    uniqueViewers: number;
    totalImpressions: number;
    clickedCount: number;
    dismissedCount: number;
    clickThroughRate: number;
  };
  recentActions: RecentAction[];
}
