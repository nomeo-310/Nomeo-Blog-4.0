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

/**
 * One hero carousel slide. Hero is reserved for actual posts — never a
 * standalone external-product creative — so every slide is just a HomePost;
 * `promotedAdvertId` is set when an admin promoted this specific post into
 * the hero slot (a "hero"-placement Advert with this post as its postId),
 * and is null for an organic trending slide. The id, when present, is only
 * used for impression/click tracking — the link/visuals are identical
 * either way (see hero-carousel.tsx).
 */
export type HeroSlide = {
  post: HomePost;
  promotedAdvertId: string | null;
};

export type PageData = {
  /** Trending posts, top-N — the hero carousel's fallback pool when no "hero"-placement advert is live. */
  heroTrendingPosts: HomePost[];
  posts: HomePost[];
  lounges: HomeLounge[];
  categories: string[];
  total: number;
};
