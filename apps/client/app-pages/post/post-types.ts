export interface PostCoverImage { secureUrl: string; publicId: string; }
export interface PostAuthor { id: string; name: string; username: string; avatar: string; bio: string; }
export interface PostSeriesLink { slug: string; title: string; }
export interface PostSeries { id: string; title: string; prev: PostSeriesLink | null; next: PostSeriesLink | null; }

export interface FullPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: PostCoverImage | null;
  tags: string[];
  category: string;
  readingTime: number | null;
  access: "free" | "paid";
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  publishedAt: string | null;
  isFeatured: boolean;
  seriesId: string | null;
  seriesOrder: number | null;
  author: PostAuthor;
  coAuthors: PostAuthor[];
  series: PostSeries | null;
}

export interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  publishedAt: string | null;
  readingTime: number | null;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  savesCount: number;
  author: { name: string; username: string; avatar: string; };
}
