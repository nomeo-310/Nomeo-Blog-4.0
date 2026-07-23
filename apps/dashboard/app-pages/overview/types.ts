export interface RecentActivityItem {
  id:          string;
  summary:     string;
  action:      string;
  actorRole:   string;
  targetType?: string;
  createdAt:   string;
}

export interface OverviewData {
  totalUsers:          number;
  newUsersToday:       number;
  userGrowthPct:       number | null;

  totalCreators:       number;

  totalPosts:          number;
  postsPublishedToday: number;

  revenueThisMonth:    number;
  revenueGrowthPct:    number | null;

  activeSubscriptions:       number;
  newSubscriptionsThisMonth: number;

  pendingApplications: number;
  bannedUsers:         number;
  pendingReports:      number;
  unresolvedErrors:    number;

  recentActivity: RecentActivityItem[];
  generatedAt:    string;
}
