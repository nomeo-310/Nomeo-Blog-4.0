export type PostStatusFilter = "all" | "draft" | "published" | "archived" | "removed";
export type PostAccessFilter = "all" | "free" | "paid";
export type PostSortBy = "newest" | "oldest" | "most_viewed" | "most_reported";

export interface PersonRef {
  id:    string;
  name:  string;
  email: string;
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  author: PersonRef;
  access: string;
  status: string;
  isFeatured: boolean;
  isRemoved: boolean;
  pendingReportsCount: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  tags: string[];
  category?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface PostsListResponse {
  filters: {
    status: string; access: string; topic: string | null; authorId: string | null;
    featured: string | null; hasOpenReports: boolean; search?: string;
  };
  sortBy: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  posts: PostListItem[];
}

export interface CoAuthorDetail extends PersonRef {
  role: string;
  status: string;
  showOnByline: boolean;
}

export interface ReportDetail {
  id: string;
  reason: string;
  details?: string;
  reportedBy: PersonRef;
  reportedAt: string;
  reviewed: boolean;
  reviewedBy: PersonRef | null;
  reviewedAt?: string;
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

export interface PostDetailResponse {
  post: {
    id: string; title: string; slug: string; excerpt?: string; content: string;
    author: PersonRef;
    coAuthors: CoAuthorDetail[];
    tags: string[]; category?: string; readingTime?: number;
    access: string; status: string;
    series: { id: string; title: string; postsCount: number } | null;
    isFeatured: boolean; isRemoved: boolean;
    removedBy: PersonRef | null; removedAt?: string; removalReason?: string;
    viewsCount: number; likesCount: number; commentsCount: number; savesCount: number;
    subscriberReadMinutes: number;
    publishedAt?: string; createdAt: string; updatedAt: string;
  };
  reports: ReportDetail[];
  pendingReportsCount: number;
  recentActions: RecentAction[];
}

export interface CommentListItem {
  id: string;
  author: PersonRef;
  parentId: string | null;
  body: string;
  status: string;
  isRemoved: boolean;
  isDeletedByAuthor: boolean;
  likesCount: number;
  repliesCount: number;
  pendingReportsCount: number;
  isAuthorReply: boolean;
  createdAt: string;
}

export interface CommentsListResponse {
  postId: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  comments: CommentListItem[];
}
