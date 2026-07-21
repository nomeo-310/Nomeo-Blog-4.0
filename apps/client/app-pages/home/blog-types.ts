export type Post = {
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
  publishedAt: string | null;
  author: { name: string; username: string; avatar: string };
};
