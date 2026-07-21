export type Reply = {
  id: string;
  body: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  likesCount: number;
  isLiked: boolean;
  isOwnComment: boolean;
  isDeletedByAuthor: boolean;
  createdAt: string;
};

export type Comment = {
  id: string;
  body: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  likesCount: number;
  isLiked: boolean;
  isOwnComment: boolean;
  isDeletedByAuthor: boolean;
  createdAt: string;
  replies: Reply[];
};
