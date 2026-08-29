export type CreatorStatusFilter = "all" | "active" | "suspended";
export type CreatorSortBy       = "newest" | "oldest" | "most_followers" | "most_posts";
export type PayoutStatus = "pending" | "calculated" | "processing" | "paid" | "failed" | "on_hold";

export interface CreatorListItem {
  id: string;
  name: string;
  email: string;
  username: string | null;
  displayName: string;
  avatar: string;
  banStatus: string;
  creatorStatus: string | null;
  creatorSuspensionReason: string | null;
  becameCreatorAt: string | null;
  followersCount: number;
  postsCount: number;
  creatorTopics: string[];
  createdAt: string;
}

export interface CreatorsListResponse {
  filters: { creatorStatus: string; search?: string };
  sortBy: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  creators: CreatorListItem[];
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

export interface EarningSummary {
  id: string;
  billingPeriod: string;
  grossAmount: number;
  netAmount: number;
  currency: string;
  payoutStatus: string;
}

export interface CreatorDetailResponse {
  creator: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    createdAt: string;
  };
  profile: {
    username: string;
    displayName: string;
    bio?: string;
    about?: string;
    banStatus: string;
    creatorStatus: string | null;
    creatorSuspensionReason?: string;
    creatorSuspendedAt?: string;
    becameCreatorAt?: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    creatorTopics: string[];
  } | null;
  recentEarnings: EarningSummary[];
  recentActions: RecentAction[];
}

export interface EarningListItem {
  id: string;
  billingPeriod: string;
  payoutModel: "fixed_rate" | "pool_share";
  completedReadsCount: number;
  ratePerCompletedRead: number;
  payoutScaleFactor: number;
  weightedReadMinutes: number;
  readMinutesShare: number;
  grossAmount: number;
  platformCutAmount: number;
  netAmount: number;
  currency: string;
  payoutStatus: string;
  topPosts: Array<{ postId: string; title: string; completedReadsCount: number; weightedReadMinutes: number; readerCount: number; grossContribution: number }>;
  payoutRequestedAt?: string;
  payoutTransferId?: string;
  payoutInitiatedAt?: string;
  payoutCompletedAt?: string;
  payoutFailureReason?: string;
  adminNotes?: string;
}

export interface CreatorEarningsResponse {
  creatorId: string;
  filters: { payoutStatus: string };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  earnings: EarningListItem[];
}
