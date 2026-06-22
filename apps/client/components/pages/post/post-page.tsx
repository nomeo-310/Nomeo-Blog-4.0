import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import {
  ArrowLeft, Clock, Eye, Lock, BookOpen,
  ChevronLeft, ChevronRight, MessageCircle,
  Heart, Bookmark,
} from "lucide-react";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { PostActions } from "./post-actions";
import { CommentSection } from "./comment-section";
import PaywallGate from "./pay-wall-gate";
import { PostViewTracker } from "./post-view-tracker";
import { resolvePostAccess } from "@/services/post-access-services";

/**
 * PostPage — Nomeo post reader.
 *
 * Layout (after reading):
 *   LEFT  column: article content → post actions → related posts
 *   RIGHT column: author bio cards (top, sticky) → comments below
 *
 * Route: app/post/[slug]/page.tsx
 */

/* ── Types ──────────────────────────────────────────────────────────────── */

interface PostCoverImage { secureUrl: string; publicId: string; }
interface PostAuthor { id: string; name: string; username: string; avatar: string; bio: string; }
interface PostSeriesLink { slug: string; title: string; }
interface PostSeries { id: string; title: string; prev: PostSeriesLink | null; next: PostSeriesLink | null; }

interface FullPost {
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

interface RelatedPost {
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

interface GenerateMetadataProps { params: Promise<{ slug: string }>; }
interface PostPageProps { slug: string; user: Awaited<ReturnType<typeof getCurrentUser>>; }

/* ── Metadata ───────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: GenerateMetadataProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found — Nomeo" };

  const url         = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/post/${post.slug}`;
  const image       = post.coverImage?.secureUrl ?? null;
  const description = post.excerpt || `Read "${post.title}" on Nomeo — long-form writing worth your time.`;

  return {
    title:       `${post.title} — Nomeo`,
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
      type:        "article",
      url,
      title:       post.title,
      description,
      siteName:    "Nomeo",
      publishedTime: post.publishedAt ?? undefined,
      authors:     post.author.username
        ? [`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/profile/${post.author.username}`]
        : undefined,
      tags:        post.tags.length ? post.tags : undefined,
      images:      image
        ? [{ url: image, width: 1200, height: 630, alt: post.title }]
        : [],
    },

    // Twitter / X card — "summary_large_image" shows a large image above
    // the title/description. Without this Twitter falls back to "summary"
    // which is just a tiny thumbnail. The cover image IS the share preview.
    twitter: {
      card:        "summary_large_image",
      title:       post.title,
      description,
      images:      image ? [image] : [],
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

      {/* Back */}
      <div className="pb-2 pt-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </Link>
      </div>

      {/* Cover image */}
      {post.coverImage?.secureUrl && (
        <div className="relative mt-4 aspect-[21/9] w-full overflow-hidden rounded-2xl border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverImage.secureUrl} alt="" loading="eager" className="h-full w-full object-cover" />
          {post.isFeatured && (
            <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Featured
            </span>
          )}
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────────────
          LEFT  (65%): article → post actions → related posts
          RIGHT (35%): author bio cards (sticky top) → comment section
      ──────────────────────────────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(340px,480px)] xl:grid-cols-[1fr_minmax(380px,500px)] 2xl:grid-cols-[1fr_minmax(380px,550px)]">

        {/* ── LEFT: article ─────────────────────────────────────────────── */}
        <div className="min-w-0">
          <div className="max-w-none">

            {/* Series nav */}
            {post.series && (
              <div className="mb-6 rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  <BookOpen className="mr-1 inline h-3.5 w-3.5" />
                  Series · {post.series.title}
                </p>
                <div className="mt-2 flex items-center justify-between gap-4">
                  {post.series.prev ? (
                    <Link href={`/post/${post.series.prev.slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{post.series.prev.title}</span>
                    </Link>
                  ) : <span />}
                  {post.series.next && (
                    <Link href={`/post/${post.series.next.slug}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <span className="line-clamp-1">{post.series.next.title}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
            )}

            {/* Meta row */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
              {/* Avatar stack — industry style overlapping avatars, no names */}
              <AvatarStack author={post.author} coAuthors={post.coAuthors} />
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                {post.readingTime && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />{post.readingTime} min read
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />{formatCount(post.viewsCount)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />{formatCount(post.commentsCount)}
                </span>
                {post.access === "paid" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    <Lock className="h-3 w-3" /> Members
                  </span>
                )}
              </div>
            </div>

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
        <div id="comments" className="flex flex-col gap-6">

          {/* Author bio cards — above comments, not sticky individually
              but the whole right column is sticky at top on desktop     */}
          {access.canRead && (
            <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
              {/* Author bio — main author gets own card, co-authors share one card */}
              <div className="space-y-4">
                <PersonBioCard
                  label="Written by"
                  name={post.author.name}
                  username={post.author.username}
                  avatar={post.author.avatar}
                  bio={post.author.bio}
                />
                {post.coAuthors.length > 0 && (
                  <CoAuthorsBioCard coAuthors={post.coAuthors} />
                )}
              </div>

              {/* Comment section */}
              <CommentSection
                postSlug={post.slug}
                isSignedIn={!!user}
                currentUserId={user?.id}
                currentUserName={user?.name ?? undefined}
                currentUserAvatar={user?.avatar ?? undefined}
              />
            </div>
          )}

          {/* Paywall — comments hidden when content gated */}
          {!access.canRead && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Comments are visible once you have access to this post.
              </p>
            </div>
          )}
        </div>

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
          id:    String(raw.seriesId),
          title: String(seriesDoc.title || "Series"),
          prev:  prevRaw ? { slug: String(prevRaw.slug),  title: String(prevRaw.title)  } : null,
          next:  nextRaw ? { slug: String(nextRaw.slug),  title: String(nextRaw.title)  } : null,
        };
      }
    }

    return {
      id:            String(raw._id),
      title:         String(raw.title   || "Untitled"),
      slug:          String(raw.slug    || raw._id),
      excerpt:       String(raw.excerpt || ""),
      content:       String(raw.content || ""),
      coverImage:    raw.coverImage?.secureUrl
        ? { secureUrl: raw.coverImage.secureUrl, publicId: raw.coverImage.publicId || "" }
        : raw.coverImage && typeof raw.coverImage === "string"
        ? { secureUrl: raw.coverImage, publicId: "" }
        : null,
      tags:          Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean) : [],
      category:      String(raw.category || ""),
      readingTime:   typeof raw.readingTime === "number" ? raw.readingTime : null,
      access:        raw.access === "paid" ? "paid" : "free",
      viewsCount:    Number(raw.viewsCount    || 0),
      likesCount:    Number(raw.likesCount    || 0),
      commentsCount: Number(raw.commentsCount || 0),
      savesCount:    Number(raw.savesCount    || 0),
      publishedAt:   raw.publishedAt instanceof Date ? raw.publishedAt.toISOString() : null,
      isFeatured:    !!raw.isFeatured,
      seriesId:      raw.seriesId ? String(raw.seriesId) : null,
      seriesOrder:   raw.seriesOrder ?? null,
      author: {
        id:       authorId,
        name:     String(authorProfile?.displayName || authorProfile?.username || "Nomeo writer"),
        username: String(authorProfile?.username || ""),
        avatar:   String(authorProfile?.profileImage?.url || ""),
        bio:      String(authorProfile?.bio || ""),
      },
      coAuthors: coAuthorIds.map((id) => {
        const p = profileMap.get(id);
        return {
          id,
          name:     String(p?.displayName || p?.username || "Co-author"),
          username: String(p?.username || ""),
          avatar:   String(p?.profileImage?.url || ""),
          bio:      String(p?.bio || ""),
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
      slug:      { $ne: currentSlug },
      status:    "published",
      isRemoved: { $ne: true },
    };

    // Match by category OR shared tags
    if (category || tags.length) {
      const conditions: any[] = [];
      if (category)      conditions.push({ category });
      if (tags.length)   conditions.push({ tags: { $in: tags } });
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
    const profiles  = authorIds.length
      ? await db.collection("profiles")
          .find({ userId: { $in: authorIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { projection: { userId: 1, username: 1, displayName: 1, profileImage: 1 } })
          .toArray()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    return raws.map((r) => {
      const p = profileMap.get(String(r.authorId));
      return {
        id:            String(r._id),
        slug:          String(r.slug  || r._id),
        title:         String(r.title || "Untitled"),
        excerpt:       String(r.excerpt || ""),
        coverImage:    r.coverImage?.secureUrl || (typeof r.coverImage === "string" ? r.coverImage : ""),
        category:      String(r.category || ""),
        publishedAt:   r.publishedAt instanceof Date ? r.publishedAt.toISOString() : null,
        readingTime:   typeof r.readingTime === "number" ? r.readingTime : null,
        likesCount:    Number(r.likesCount    || 0),
        commentsCount: Number(r.commentsCount || 0),
        viewsCount:    Number(r.viewsCount    || 0),
        savesCount:    Number(r.savesCount    || 0),
        author: {
          name:     String(p?.displayName || p?.username || "Nomeo writer"),
          username: String(p?.username || ""),
          avatar:   String(p?.profileImage?.url || ""),
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

/* ── UI components ──────────────────────────────────────────────────────── */

function PostContent({ content }: { content: string }) {
  return (
    <>
      <style>{`
        .post-content [style*="text-align: center"]  { text-align: center !important; }
        .post-content [style*="text-align: right"]   { text-align: right  !important; }
        .post-content [style*="text-align: left"]    { text-align: left   !important; }
        .post-content [style*="text-align: justify"] { text-align: justify !important; }

        .post-content mark {
          background-color: oklch(0.97 0.12 95);
          color: inherit;
          border-radius: 0.2em;
          padding: 0.05em 0.25em;
        }
        .dark .post-content mark {
          background-color: oklch(0.45 0.12 85 / 0.5);
        }

        .post-content ul { list-style-type: disc;    padding-left: 1.625em; }
        .post-content ol { list-style-type: decimal; padding-left: 1.625em; }
        .post-content ul ul  { list-style-type: circle; }
        .post-content ul ul ul { list-style-type: square; }
        .post-content li   { margin-top: 0.375em; margin-bottom: 0.375em; }
        .post-content p  { margin-top: 1.5em; margin-bottom: 1.5em; }
        .post-content p:first-child { margin-top: 0; }
        .post-content p:last-child  { margin-bottom: 0; }
        .post-content li p { margin-top: 0; margin-bottom: 0; }

        .post-content p img { display: block; max-width: 100%; }
        .post-content p[style*="text-align: center"] img { margin-left: auto; margin-right: auto; }
        .post-content p[style*="text-align: right"]  img { margin-left: auto; }

        .post-content hr { border-color: hsl(var(--border)); margin: 2rem 0; }
      `}</style>

      <div
        className="post-content prose prose-neutral dark:prose-invert mt-8 max-w-none
          prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-left
          prose-p:leading-relaxed prose-p:text-justify prose-p:my-6
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:mx-auto
          prose-blockquote:border-l-primary prose-blockquote:not-italic prose-blockquote:text-muted-foreground prose-blockquote:text-left
          prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono
          prose-code:before:content-none prose-code:after:content-none
          prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-muted prose-pre:text-left
          prose-hr:border-border"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </>
  );
}

/**
 * AvatarStack — overlapping avatars for author + co-authors.
 * Industry standard (GitHub, Figma, Notion): each avatar overlaps the
 * previous by ~8px with a ring so they separate visually.
 * Shows max 4, then a +N overflow badge.
 */
function AvatarStack({ author, coAuthors }: {
  author: PostAuthor;
  coAuthors: PostAuthor[];
}) {
  const all     = [author, ...coAuthors];
  const MAX     = 4;
  const visible = all.slice(0, MAX);
  const overflow = all.length - MAX;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((person, i) => {
          const href = person.username ? `/profile/${person.username}` : "#";
          return (
            <Link
              key={person.id}
              href={href}
              title={`${person.name}${i === 0 ? " (author)" : " (co-author)"}`}
              style={{ zIndex: visible.length - i }}
              className="relative rounded-full ring-2 ring-card transition-transform hover:z-10 hover:scale-110"
            >
              {person.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatar} alt={person.name} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {person.name.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
          );
        })}
        {overflow > 0 && (
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-2 ring-card">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}

function PersonBioCard({
  label, name, username, avatar, bio,
}: {
  label: string; name: string; username: string; avatar: string; bio: string;
}) {
  if (!bio && !username) return null;
  const href = username ? `/profile/${username}` : "#";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-start gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link href={href} className="font-heading text-sm font-bold text-foreground hover:text-primary">
            {name}
          </Link>
          {username && <p className="text-xs text-muted-foreground">@{username}</p>}
          {bio && (
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{bio}</p>
          )}
          <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            More by {name} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * CoAuthorsBioCard — all co-authors in a single card.
 * Divider between each co-author, none after the last.
 */
function CoAuthorsBioCard({ coAuthors }: { coAuthors: PostAuthor[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Co-author{coAuthors.length > 1 ? "s" : ""}
      </p>
      <div>
        {coAuthors.map((ca, i) => {
          const href = ca.username ? `/profile/${ca.username}` : "#";
          return (
            <div key={ca.id}>
              <div className="flex items-start gap-3">
                {ca.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ca.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                    {ca.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={href} className="font-heading text-sm font-bold text-foreground hover:text-primary">
                    {ca.name}
                  </Link>
                  {ca.username && <p className="text-xs text-muted-foreground">@{ca.username}</p>}
                  {ca.bio && (
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{ca.bio}</p>
                  )}
                  <Link href={href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    More by {ca.name} <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              {i < coAuthors.length - 1 && (
                <div className="my-4 border-t border-border" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Related Posts ──────────────────────────────────────────────────────── */

function RelatedPosts({ posts }: { posts: RelatedPost[] }) {
  return (
    <div className="mt-12">
      <h2 className="font-heading text-xl font-bold text-foreground">Related posts</h2>
      <div className="mt-4">
        {posts.map((post, i) => (
          <div key={post.id}>
            <RelatedPostCard post={post} />
            {/* Divider between items — not after the last one */}
            {i < posts.length - 1 && (
              <div className="border-t border-border" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedPostCard({ post }: { post: RelatedPost }) {
  return (
    <Link
      href={`/post/${post.slug}`}
      className="group flex items-start gap-4 py-5 transition-colors"
    >
      {/* Text content */}
      <div className="min-w-0 flex-1">
        {/* Author row */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {post.author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {post.author.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="font-medium text-foreground">{post.author.name}</span>
          {post.author.username && <span>· @{post.author.username}</span>}
          {post.publishedAt && <span>· {formatDate(post.publishedAt)}</span>}
        </div>

        {/* Title */}
        <h3 className="font-heading text-base font-bold leading-snug text-foreground group-hover:text-primary line-clamp-2">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        {/* Footer: category + stats */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {post.category && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {post.category}
            </span>
          )}
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />{formatCount(post.likesCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />{formatCount(post.commentsCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />{formatCount(post.viewsCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bookmark className="h-3.5 w-3.5" />{formatCount(post.savesCount)}
            </span>
          </div>
        </div>
      </div>

      {/* Cover image — flush right, no card treatment */}
      {post.coverImage && (
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
    </Link>
  );
}

/* ── Utils ──────────────────────────────────────────────────────────────── */

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}