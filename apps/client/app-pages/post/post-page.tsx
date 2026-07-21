import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { resolvePostAccess } from "@/services/post-access-services";
import { PostViewTracker } from "./post-view-tracker";
import { PostHero } from "./post-hero";
import { PostHeader } from "./post-header";
import { PostContent } from "./post-content";
import { PostActions } from "./post-actions";
import { PostSidebar } from "./post-sidebar";
import { RelatedPosts } from "./post-related";
import PaywallGate from "./pay-wall-gate";
import type { FullPost, RelatedPost } from "./post-types";

/**
 * PostPage — Nomeo post reader.
 *
 * Layout (after reading):
 *   LEFT  column: article header → content → post actions → related posts
 *   RIGHT column: author bio cards (top, sticky) → comments below
 *
 * Layout is composed from sibling sub-components in this same folder
 * (post-hero, post-header, post-content, post-actions, post-sidebar,
 * post-related, pay-wall-gate, post-view-tracker, comment-section); this
 * file owns the data layer (below) and the top-level composition only.
 *
 * Route: app/(root)/post/[slug]/page.tsx
 */

interface GenerateMetadataProps { params: Promise<{ slug: string }>; }
interface PostPageProps { slug: string; user: Awaited<ReturnType<typeof getCurrentUser>>; }

/* ── Metadata ───────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: GenerateMetadataProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found — Nomeo" };

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/post/${post.slug}`;
  const image = post.coverImage?.secureUrl ?? null;
  const description = post.excerpt || `Read "${post.title}" on Nomeo — long-form writing worth your time.`;

  return {
    title: `${post.title} — Nomeo`,
    description,

    // Canonical URL — prevents duplicate content if the page is ever
    // served with query params or different paths
    alternates: { canonical: url },

    // Keywords from tags
    keywords: post.tags.length ? post.tags.join(", ") : undefined,

    // Open Graph — controls how the post looks when shared on Facebook,
    // LinkedIn, iMessage, Slack, Discord, etc. The image is what gets
    // shown as the preview card thumbnail; without it most platforms
    // show a blank or generic fallback.
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description,
      siteName: "Nomeo",
      publishedTime: post.publishedAt ?? undefined,
      authors: post.author.username
        ? [`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/profile/${post.author.username}`]
        : undefined,
      tags: post.tags.length ? post.tags : undefined,
      images: image
        ? [{ url: image, width: 1200, height: 630, alt: post.title }]
        : [],
    },

    // Twitter / X card — "summary_large_image" shows a large image above
    // the title/description. Without this Twitter falls back to "summary"
    // which is just a tiny thumbnail. The cover image IS the share preview.
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: image ? [image] : [],
    },
  };
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function PostPage({ slug, user }: PostPageProps) {
  const post = await getPost(slug);
  if (!post) notFound();

  const [access, userInteractions, relatedPosts] = await Promise.all([
    resolvePostAccess(post.id, user?.id ?? null),
    user ? getUserInteractions(post.id, user.id) : Promise.resolve({ liked: false, saved: false }),
    getRelatedPosts(post.slug, post.category, post.tags),
  ]);

  return (
    <div className="w-full bg-background pb-24">
      <PostViewTracker postSlug={post.slug} canRead={access.canRead} />

      <PostHero post={post} />

      {/* ── Two-column layout ─────────────────────────────────────────────
          LEFT  (65%): article → post actions → related posts
          RIGHT (35%): author bio cards (sticky top) → comment section
      ──────────────────────────────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">

        {/* ── LEFT: article ─────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="max-w-none">
            <PostHeader post={post} />

            {/* ── Content or paywall ───────────────────────────────────── */}
            {access.canRead ? (
              <>
                <PostContent content={post.content} />

                <PostActions
                  postSlug={post.slug}
                  postTitle={post.title}
                  coverImage={post.coverImage?.secureUrl ?? undefined}
                  initialLiked={userInteractions.liked}
                  initialSaved={userInteractions.saved}
                  likesCount={post.likesCount}
                  commentsCount={post.commentsCount}
                  savesCount={post.savesCount}
                  isSignedIn={!!user}
                />

                {/* Related posts — below the inline actions */}
                {relatedPosts.length > 0 && (
                  <RelatedPosts posts={relatedPosts} />
                )}
              </>
            ) : (
              <PaywallGate
                needsMembership={access.needsMembership}
                isGuest={!user}
                freeReadsRemaining={access.freeReadsRemaining}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT: author bios (top) + comments ───────────────────────── */}
        <PostSidebar post={post} canRead={access.canRead} viewer={user} />
      </div>
    </div>
  );
}

/* ── Data layer ─────────────────────────────────────────────────────────── */

async function getPost(slug: string): Promise<FullPost | null> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return null;

    const raw = await db.collection("posts").findOne(
      { slug, status: "published", isRemoved: { $ne: true } },
      {
        projection: {
          title: 1, slug: 1, excerpt: 1, content: 1, coverImage: 1,
          tags: 1, category: 1, readingTime: 1, access: 1,
          viewsCount: 1, likesCount: 1, commentsCount: 1, savesCount: 1,
          publishedAt: 1, isFeatured: 1, authorId: 1, coAuthors: 1,
          seriesId: 1, seriesOrder: 1,
        },
      }
    );
    if (!raw) return null;

    const authorId = String(raw.authorId || "");
    const coAuthorIds: string[] = (raw.coAuthors ?? [])
      .filter((ca: any) => ca.status === "accepted" && ca.showOnByline)
      .map((ca: any) => String(ca.userId));
    const allUserIds = [...new Set([authorId, ...coAuthorIds])].filter((id) => mongoose.Types.ObjectId.isValid(id));

    const profiles = allUserIds.length
      ? await db.collection("profiles")
        .find({ userId: { $in: allUserIds.map((id) => new mongoose.Types.ObjectId(id)) } },
          { projection: { userId: 1, username: 1, displayName: 1, profileImage: 1, bio: 1 } })
        .toArray()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));
    const authorProfile = profileMap.get(authorId);

    let series: FullPost["series"] = null;
    if (raw.seriesId && raw.seriesOrder != null) {
      const [seriesDoc, prevRaw, nextRaw] = await Promise.all([
        db.collection("post_series").findOne({ _id: new mongoose.Types.ObjectId(String(raw.seriesId)) }, { projection: { title: 1 } }),
        db.collection("posts").findOne({ seriesId: raw.seriesId, seriesOrder: raw.seriesOrder - 1, status: "published" }, { projection: { title: 1, slug: 1 } }),
        db.collection("posts").findOne({ seriesId: raw.seriesId, seriesOrder: raw.seriesOrder + 1, status: "published" }, { projection: { title: 1, slug: 1 } }),
      ]);
      if (seriesDoc) {
        series = {
          id: String(raw.seriesId),
          title: String(seriesDoc.title || "Series"),
          prev: prevRaw ? { slug: String(prevRaw.slug), title: String(prevRaw.title) } : null,
          next: nextRaw ? { slug: String(nextRaw.slug), title: String(nextRaw.title) } : null,
        };
      }
    }

    return {
      id: String(raw._id),
      title: String(raw.title || "Untitled"),
      slug: String(raw.slug || raw._id),
      excerpt: String(raw.excerpt || ""),
      content: String(raw.content || ""),
      coverImage: raw.coverImage?.secureUrl
        ? { secureUrl: raw.coverImage.secureUrl, publicId: raw.coverImage.publicId || "" }
        : raw.coverImage && typeof raw.coverImage === "string"
          ? { secureUrl: raw.coverImage, publicId: "" }
          : null,
      tags: Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean) : [],
      category: String(raw.category || ""),
      readingTime: typeof raw.readingTime === "number" ? raw.readingTime : null,
      access: raw.access === "paid" ? "paid" : "free",
      viewsCount: Number(raw.viewsCount || 0),
      likesCount: Number(raw.likesCount || 0),
      commentsCount: Number(raw.commentsCount || 0),
      savesCount: Number(raw.savesCount || 0),
      publishedAt: raw.publishedAt instanceof Date ? raw.publishedAt.toISOString() : null,
      isFeatured: !!raw.isFeatured,
      seriesId: raw.seriesId ? String(raw.seriesId) : null,
      seriesOrder: raw.seriesOrder ?? null,
      author: {
        id: authorId,
        name: String(authorProfile?.displayName || authorProfile?.username || "Nomeo writer"),
        username: String(authorProfile?.username || ""),
        avatar: String(authorProfile?.profileImage?.url || ""),
        bio: String(authorProfile?.bio || ""),
      },
      coAuthors: coAuthorIds.map((id) => {
        const p = profileMap.get(id);
        return {
          id,
          name: String(p?.displayName || p?.username || "Co-author"),
          username: String(p?.username || ""),
          avatar: String(p?.profileImage?.url || ""),
          bio: String(p?.bio || ""),
        };
      }),
      series,
    };
  } catch (err) {
    console.error("[PostPage] Failed to load post", err);
    return null;
  }
}

/**
 * getRelatedPosts — fetches up to 3 published posts that share the same
 * category or at least one tag, excluding the current post.
 */
async function getRelatedPosts(
  currentSlug: string,
  category: string,
  tags: string[],
): Promise<RelatedPost[]> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];

    const filter: Record<string, any> = {
      slug: { $ne: currentSlug },
      status: "published",
      isRemoved: { $ne: true },
    };

    // Match by category OR shared tags
    if (category || tags.length) {
      const conditions: any[] = [];
      if (category) conditions.push({ category });
      if (tags.length) conditions.push({ tags: { $in: tags } });
      if (conditions.length) filter.$or = conditions;
    }

    const raws = await db.collection("posts")
      .find(filter, {
        projection: {
          title: 1, slug: 1, excerpt: 1, coverImage: 1, category: 1,
          tags: 1, publishedAt: 1, readingTime: 1, authorId: 1,
          likesCount: 1, commentsCount: 1, viewsCount: 1, savesCount: 1,
        },
      })
      .sort({ publishedAt: -1 })
      .limit(3)
      .toArray();

    if (!raws.length) return [];

    // Fetch author profiles for all related posts in one query
    const authorIds = [...new Set(raws.map((r) => String(r.authorId)))].filter((id) => mongoose.Types.ObjectId.isValid(id));
    const profiles = authorIds.length
      ? await db.collection("profiles")
        .find({ userId: { $in: authorIds.map((id) => new mongoose.Types.ObjectId(id)) } },
          { projection: { userId: 1, username: 1, displayName: 1, profileImage: 1 } })
        .toArray()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    return raws.map((r) => {
      const p = profileMap.get(String(r.authorId));
      return {
        id: String(r._id),
        slug: String(r.slug || r._id),
        title: String(r.title || "Untitled"),
        excerpt: String(r.excerpt || ""),
        coverImage: r.coverImage?.secureUrl || (typeof r.coverImage === "string" ? r.coverImage : ""),
        category: String(r.category || ""),
        publishedAt: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : null,
        readingTime: typeof r.readingTime === "number" ? r.readingTime : null,
        likesCount: Number(r.likesCount || 0),
        commentsCount: Number(r.commentsCount || 0),
        viewsCount: Number(r.viewsCount || 0),
        savesCount: Number(r.savesCount || 0),
        author: {
          name: String(p?.displayName || p?.username || "Nomeo writer"),
          username: String(p?.username || ""),
          avatar: String(p?.profileImage?.url || ""),
        },
      };
    });
  } catch (err) {
    console.error("[RelatedPosts] Failed", err);
    return [];
  }
}

async function getUserInteractions(postId: string, userId: string) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return { liked: false, saved: false };
    const pid = new mongoose.Types.ObjectId(postId);
    const uid = new mongoose.Types.ObjectId(userId);
    const [liked, saved] = await Promise.all([
      db.collection("reactions").findOne({ userId: uid, targetId: pid, targetType: "post" }),
      db.collection("saved_posts").findOne({ userId: uid, postId: pid }),
    ]);
    return { liked: !!liked, saved: !!saved };
  } catch { return { liked: false, saved: false }; }
}
