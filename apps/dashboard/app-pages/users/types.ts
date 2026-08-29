export type UserBanFilter   = "all" | "active" | "banned" | "shadow_banned";
export type UserSortBy      = "newest" | "oldest" | "most_followers" | "most_posts";

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  avatar: string;
  username: string | null;
  displayName: string;
  banStatus: string;
  banExpiresAt: string | null;
  creatorStatus: string | null;
  followersCount: number;
  postsCount: number;
  freeReadsRemaining: number;
  createdAt: string;
}

export interface UsersListResponse {
  filters: { banStatus: string; search?: string };
  sortBy: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  users: UserListItem[];
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

export interface UserDetailResponse {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: string;
    avatar: string;
    createdAt: string;
  };
  profile: {
    username: string;
    displayName: string;
    bio?: string;
    profileImage?: { url: string } | null;
    coverImage?: { url: string } | null;
    location?: string;
    banStatus: string;
    banReason?: string;
    bannedAt?: string;
    banExpiresAt?: string;
    creatorStatus: string | null;
    becameCreatorAt?: string | null;
    freeReadsRemaining: number;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    savedPostsCount: number;
    interests: string[];
    isPublic: boolean;
  } | null;
  subscription: {
    status: string;
    interval: string;
    currentPeriodEnd: string;
    autoRenew: boolean;
  } | null;
  recentActions: RecentAction[];
}
