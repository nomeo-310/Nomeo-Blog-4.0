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
