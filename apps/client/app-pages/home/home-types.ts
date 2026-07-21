export type HomePost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: { secureUrl: string; publicId: string } | null;
  tags: string[];
  category: string;
  readingTime: number | null;
  access: "free" | "paid";
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  publishedAt: string | null;
  author: { name: string; username: string; avatar: string };
  externalUrl?: string;
};

export type HomeLounge = {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  messagesCount: number;
};

export type PageData = {
  hero: HomePost | null;
  posts: HomePost[];
  lounges: HomeLounge[];
  categories: string[];
  total: number;
};
