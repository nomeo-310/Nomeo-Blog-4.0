export type Connection = {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  isCreator: boolean;
};

export type Tab = "following" | "followers";
