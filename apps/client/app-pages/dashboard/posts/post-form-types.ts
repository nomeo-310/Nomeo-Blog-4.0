/**
 * Shared types + constants for the new-post / edit-post forms and their
 * split-out field components (post-cover-image-field, post-excerpt-field,
 * post-category-field, post-tags-field, post-access-field,
 * post-series-field, post-new-series-modal, post-coauthors-field).
 */

export type CoverImage   = { url: string; publicId: string } | null;
export type Status       = "draft" | "published";
export type CoAuthorRole = "writer" | "editor" | "reviewer";

export type Series = { id: string; title: string; postsCount: number };

export type CoAuthor = {
  userId:       string;
  name:         string;
  username:     string;
  avatar:       string;
  role:         CoAuthorRole;
  showOnByline: boolean;
  // Only populated on the edit-post form (pending | accepted | declined | removed).
  status?:      string;
};

export type SearchUser = { id: string; name: string; username: string; avatar: string };

export const CATEGORIES = [
  "Technology", "Culture", "Science", "Health", "Business",
  "Lifestyle", "Travel", "Food", "Fiction", "Opinion", "Other",
];

export const COAUTHOR_ROLES = [
  { value: "writer",   label: "Writer"   },
  { value: "editor",   label: "Editor"   },
  { value: "reviewer", label: "Reviewer" },
] as const;
