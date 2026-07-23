import { api } from "@/lib/axios";

/**
 * Resolves a post identifier — a real slug, OR a raw Post _id (e.g. a
 * notification's `entityId`, which is always the Mongo _id, never the
 * slug) — to its canonical slug, so callers can build a working
 * `/post/[slug]` link instead of guessing and hitting a 404.
 *
 * Returns null if the post doesn't exist, isn't published, or was
 * removed — treat null as "don't navigate", not as an error to surface.
 */
export async function resolvePostSlug(postIdOrSlug: string): Promise<string | null> {
  try {
    const { data } = await api.get<{ slug: string | null }>(`/api/posts/${postIdOrSlug}/resolve`);
    return data.slug;
  } catch {
    return null;
  }
}
