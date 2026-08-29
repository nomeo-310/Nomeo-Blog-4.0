export type FollowerStatusFilter = "active" | "all";
export type FollowerSortBy = "newest" | "oldest";

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface FollowerListItem {
  id: string;
  follower: PersonRef;
  following: PersonRef;
  isActive: boolean;
  notifyOnNewPost: boolean;
  createdAt: string;
}

export interface FollowersListResponse {
  filters: { status: string; search?: string };
  sortBy: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  followers: FollowerListItem[];
}
