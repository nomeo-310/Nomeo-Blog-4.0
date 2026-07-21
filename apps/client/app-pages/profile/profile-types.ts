export type ProfileData = {
  userId: string;
  username: string;
  displayName: string;
  pronouns: string;
  bio: string;
  about: string;
  location: string;
  occupation: string;
  avatar: string;
  coverImage: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    instagram?: string;
  };
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isCreator: boolean;
  joinedAt: string;
};

export type ProfilePost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  readingTime: number | null;
  access: "free" | "paid";
  viewsCount: number;
  publishedAt: string | null;
};

export type LoungeMemberPreview = {
  id: string;
  name: string;
  avatar: string;
};

export type ProfileLounge = {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  messagesCount: number;
  rules: string[];
  members: LoungeMemberPreview[];
} | null;
