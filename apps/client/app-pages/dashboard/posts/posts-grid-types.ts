export type DashboardPost = {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  status: string;
  access: "free" | "paid";
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  publishedAt: string | null;
  seriesTitle: string | null;
  /**
   * Soft-removed by the creator — hidden from every public surface (home
   * feed, search, profile, /post/[slug]) but still listed here in the
   * dashboard so it can be edited, restored, or permanently deleted.
   */
  isRemoved: boolean;
};

export type DashboardSeries = {
  id: string;
  title: string;
  description: string;
  postsCount: number;
  isPublished: boolean;
  coverImage: string;
  createdAt: string;
};
