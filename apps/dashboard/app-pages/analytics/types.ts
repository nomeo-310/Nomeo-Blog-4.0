export type PresetRange = "7d" | "30d" | "90d" | "12m";
export type AnalyticsRange = PresetRange | "custom" | "all";

export interface DateWindow {
  /** Preset chip, "custom" once an explicit calendar range is active, or "all" (leaderboard only). */
  preset: PresetRange | "custom" | "all";
  from?: Date;
  to?:   Date;
}

export interface SeriesPoint {
  date:  string;
  value: number;
}

/* ── Overview ────────────────────────────────────────────────────────────── */

export interface GrowthAnalytics {
  totalUsers:              number;
  newUsersInRange:         number;
  growthPct:               number | null;
  totalCreators:           number;
  creatorConversionPct:    number;
  onboardingCompletionPct: number;
  signupSeries:            SeriesPoint[];
}

export interface EngagementAnalytics {
  postsPublishedInRange:  number;
  postsGrowthPct:         number | null;
  activeReaders:          number;
  totalReads:             number;
  completionRatePct:      number;
  avgReadDurationSecs:    number;
  subscriberReadSharePct: number;
  likesInRange:           number;
  commentsInRange:        number;
  readSeries:             SeriesPoint[];
}

export interface PlanBreakdownRow {
  planId:      string;
  planName:    string;
  subscribers: number;
}

export interface RevenueAnalytics {
  mrr:                    number;
  arpu:                   number;
  activeSubscriptions:    number;
  revenueInRange:         number;
  revenueGrowthPct:       number | null;
  cancelledInRange:       number;
  churnRatePct:           number;
  paymentSuccessRatePct:  number;
  planBreakdown:          PlanBreakdownRow[];
  revenueSeries:          SeriesPoint[];
}

export interface TopEarner {
  creatorId: string;
  name:      string;
  netAmount: number;
}

export interface PayoutStatusRow {
  status:    string;
  count:     number;
  netAmount: number;
}

export interface CreatorEconomyAnalytics {
  totalCreators:        number;
  applicationsInRange:  number;
  approvalRatePct:      number | null;
  earningsPeriod:       string | null;
  topEarners:           TopEarner[];
  payoutStatusBreakdown: PayoutStatusRow[];
}

export interface AccessMixRow {
  access: string;
  count:  number;
}

export interface TopTopicRow {
  topic:      string;
  postsCount: number;
  totalViews: number;
  totalLikes: number;
}

export interface ContentAnalytics {
  accessMix: AccessMixRow[];
  topTopics: TopTopicRow[];
}

export interface ModerationAnalytics {
  pendingReports: number;
  bannedUsers:    number;
}

export interface CohortRow {
  cohortMonth:  string;
  cohortSize:   number;
  activeCount:  number;
  retentionPct: number;
}

export interface RetentionAnalytics {
  windowDays: number;
  cohorts:    CohortRow[];
}

export interface AnalyticsOverview {
  range:          AnalyticsRange;
  growth:         GrowthAnalytics;
  engagement:     EngagementAnalytics;
  revenue:        RevenueAnalytics;
  creatorEconomy: CreatorEconomyAnalytics;
  content:        ContentAnalytics;
  moderation:     ModerationAnalytics;
  retention:      RetentionAnalytics;
  generatedAt:    string;
}

/* ── Posts leaderboard ──────────────────────────────────────────────────── */

export type PostSortBy =
  | "engagement" | "views" | "likes" | "comments"
  | "saves" | "reads" | "completionRate" | "readMinutes";

export type PostAccessFilter = "all" | "free" | "paid";

export interface PostLeaderboardMetrics {
  views:                 number;
  likes:                 number;
  comments:              number;
  saves:                 number;
  reads:                 number;
  completedReads:        number;
  completionRatePct:     number;
  avgReadDurationSecs:   number;
  subscriberReadMinutes: number;
  engagementScore:       number;
}

export interface PostLeaderboardRow {
  id:          string;
  title:       string;
  slug:        string;
  author:      { id: string; name: string };
  access:      string;
  status:      string;
  publishedAt?: string;
  tags:        string[];
  category?:   string;
  metrics:     PostLeaderboardMetrics;
}

export interface PostsLeaderboardResponse {
  range:  AnalyticsRange;
  filters: { access: string; topic: string | null; creatorId: string | null; search?: string };
  sortBy: PostSortBy;
  order:  "asc" | "desc";
  pagination: { page: number; limit: number; total: number; totalPages: number };
  posts:  PostLeaderboardRow[];
  generatedAt: string;
}

/* ── Post detail ────────────────────────────────────────────────────────── */

export interface PostDetailResponse {
  post: {
    id:      string;
    title:   string;
    slug:    string;
    author:  { id: string; name: string };
    coAuthors: { id: string; name: string; role: string; status: string }[];
    tags:    string[];
    category?: string;
    access:  string;
    status:  string;
    publishedAt?: string;
    readingTime?: number;
  };
  engagement: {
    views:               number;
    likes:               number;
    comments:            number;
    saves:               number;
    pendingReportsCount: number;
    commentDepth:        { topLevel: number; replies: number };
    reactionBreakdown:   { type: string; count: number }[];
  };
  reads: {
    totalReads:          number;
    uniqueReaders:       number;
    completedReads:      number;
    completionRatePct:   number;
    avgReadDurationSecs: number;
    subscriberReadMinutes: number;
    accessMethodBreakdown: { freePost: number; freeCredit: number; subscription: number };
    readSeries: SeriesPoint[];
  };
  earnings: {
    totalGrossAmount: number;
    totalReadMinutes: number;
    periodsCount:     number;
  };
  benchmark: {
    accessTier:  string;
    sampleWindowDays: number;
    platformAvgCompletionRatePct: number;
    platformAvgViews:    number;
    platformAvgLikes:    number;
    platformAvgComments: number;
    platformAvgSaves:    number;
    sampleSize:  number;
  };
  generatedAt: string;
}
