/** One of the creator's own published posts, eligible to be promoted. */
export interface EligiblePost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: { url: string; publicId: string } | null;
}
