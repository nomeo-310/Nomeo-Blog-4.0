import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import {
  ArrowLeft, Clock, Eye, Lock, BookOpen,
  ChevronLeft, ChevronRight, MessageCircle,
} from "lucide-react";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { resolvePostAccess } from "@/services/post-access-services";
import { PostActions } from "./post-actions";
import { CommentSection } from "./comment-section";
import PaywallGate from "./pay-wall-gate";
import { PostViewTracker } from "./post-view-tracker";

/**
 * PostPage — Nomeo post reader.
 *
 * Server component for SEO. Handles:
 *   • Access gating (free / paid / paywall)
 *   • View recording (fire-and-forget, once per load)
 *   • Cover image (secureUrl from new schema)
 *   • Series navigation
 *   • Prominent paywall with large lock icon
 *   • Client islands: PostActions (like/save/share) + CommentSection
 *
 * Route: app/post/[slug]/page.tsx
 */

/* ── Types ──────────────────────────────────────────────────────────────── */

interface PostCoverImage {
  secureUrl: string;
  publicId: string;
}

interface PostAuthor {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
}

interface PostSeriesLink {
  slug: string;
  title: string;
}

interface PostSeries {
  id: string;
  title: string;
  prev: PostSeriesLink | null;
  next: PostSeriesLink | null;
}

interface PostRawCoAuthor {
  status?: string;
  showOnByline?: boolean;
  userId?: unknown;
}

interface ProfileImage {
  url?: string;
}

interface ProfileDoc {
  userId: unknown;
  username?: string;
  displayName?: string;
  profileImage?: ProfileImage;
  bio?: string;
}

interface PostSeriesDocument {
  title?: unknown;
}

interface PostNeighborPostDocument {
  title?: unknown;
  slug?: unknown;
}

interface PostRawDocument {
  _id?: unknown;
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  coverImage?: any;
  tags?: unknown;
  category?: unknown;
  readingTime?: unknown;
  access?: unknown;
  viewsCount?: unknown;
  likesCount?: unknown;
  commentsCount?: unknown;
  savesCount?: unknown;
  publishedAt?: Date | string | null;
  isFeatured?: unknown;
  authorId?: unknown;
  coAuthors?: PostRawCoAuthor[];
  seriesId?: unknown;
  seriesOrder?: number | null;
}

interface UserInteractions {
  liked: boolean;
  saved: boolean;
}

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

interface GenerateMetadataProps {
  params: Promise<{ slug: string }>;
}

interface PostPageProps {
  slug: string;
  user: Awaited<ReturnType<typeof getCurrentUser>>;
}

/* ── Metadata ───────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: GenerateMetadataProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found — Nomeo" };
  return {
    title: `${post.title} — Nomeo`,
    description: post.excerpt || `Read ${post.title} on Nomeo.`,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.coverImage?.secureUrl ? [post.coverImage.secureUrl] : [],
    },
  };
}

/* ── Page ───────────────────────────────────────────────────────────────── */

/**
 * PostPage — receives slug + pre-fetched user from the route file.
 * The route file (app/post/[slug]/page.tsx) calls getCurrentUser() and
 * wraps this component with AppLayout — same pattern as the home page.
 */
export default async function PostPage({
  slug,
  user,
}: PostPageProps) {
  const post = await getPost(slug);

  if (!post) notFound();

  // Resolve access
  const access = await resolvePostAccess(post.id, user?.id ?? null);

  // Fetch user's like/save state server-side (only if signed in)
  const userInteractions = user
    ? await getUserInteractions(post.id, user.id)
    : { liked: false, saved: false };

  return (
    <div className="w-full bg-background pb-24">

      {/* Client view tracker — deduplicates via sessionStorage */}
      <PostViewTracker postSlug={post.slug} canRead={access.canRead} />

      {/* Back */}
      <div className="pb-2 pt-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </Link>
      </div>

      {/* Cover image — full width above the two-column body */}
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

      {/* ── Two-column layout ─────────────────────────────────────────
          Left  (65%): article content — title, meta, body, actions, author bio
          Right (35%): comment section — sticky so it stays visible while
                       the reader scrolls through long articles
      ──────────────────────────────────────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(340px,420px)] xl:grid-cols-[1fr_minmax(380px,460px)] 2xl:grid-cols-[1fr_minmax(380px,500px)]">

        {/* ── LEFT: article ─────────────────────────────────────────── */}
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
          <div className="flex flex-wrap items-center gap-4">
            <AuthorChip
              id={post.author.id}
              name={post.author.name}
              username={post.author.username}
              avatar={post.author.avatar}
            />
            {post.coAuthors.map((ca) => (
              <AuthorChip key={ca.id} {...ca} label="Co-author" />
            ))}
          </div>
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

        {/* ── Content or paywall ─────────────────────────────────────── */}
        {access.canRead ? (
          <>
            <PostContent content={post.content} />

            {/* Post actions — like / save / share */}
            <PostActions
              postSlug={post.slug}
              initialLiked={userInteractions.liked}
              initialSaved={userInteractions.saved}
              likesCount={post.likesCount}
              commentsCount={post.commentsCount}
              savesCount={post.savesCount}
              isSignedIn={!!user}
            />

            {/* Author bio card */}
            <AuthorBioCard post={post} />
          </>
        ) : (
          <PaywallGate
            needsMembership={access.needsMembership}
            isGuest={!user}
            freeReadsRemaining={access.freeReadsRemaining}
          />
        )}
          </div>{/* end max-w-none */}
        </div>{/* end LEFT column */}

        {/* ── RIGHT: comments ───────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {access.canRead ? (
            <CommentSection
              postSlug={post.slug}
              isSignedIn={!!user}
              currentUserId={user?.id}
              currentUserName={user?.name ?? undefined}
              currentUserAvatar={user?.avatar ?? undefined}
            />
          ) : (
            /* Paywall — don't show comments if content is gated */
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Comments are visible once you have access to this post.
              </p>
            </div>
          )}
        </div>{/* end RIGHT column */}

      </div>{/* end two-column grid */}
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

    const authorId     = String(raw.authorId || "");
    const coAuthorIds: string[] = (raw.coAuthors ?? [])
      .filter((ca: any) => ca.status === "accepted" && ca.showOnByline)
      .map((ca: any) => String(ca.userId));
    const allUserIds   = [...new Set([authorId, ...coAuthorIds])].filter((id) => mongoose.Types.ObjectId.isValid(id));

    const profiles = allUserIds.length
      ? await db.collection("profiles")
          .find({ userId: { $in: allUserIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { projection: { userId: 1, username: 1, displayName: 1, profileImage: 1, bio: 1 } })
          .toArray()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    const authorProfile = profileMap.get(authorId);

    // Series nav
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
          prev:  prevRaw  ? { slug: String(prevRaw.slug),  title: String(prevRaw.title)  } : null,
          next:  nextRaw  ? { slug: String(nextRaw.slug),  title: String(nextRaw.title)  } : null,
        };
      }
    }

    return {
      id:           String(raw._id),
      title:        String(raw.title || "Untitled"),
      slug:         String(raw.slug || raw._id),
      excerpt:      String(raw.excerpt || ""),
      content:      String(raw.content || ""),
      // Handle both old string format and new { secureUrl, publicId } object
      coverImage:   raw.coverImage?.secureUrl
        ? { secureUrl: raw.coverImage.secureUrl, publicId: raw.coverImage.publicId || "" }
        : raw.coverImage && typeof raw.coverImage === "string"
        ? { secureUrl: raw.coverImage, publicId: "" }
        : null,
      tags:         Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean) : [],
      category:     String(raw.category || ""),
      readingTime:  typeof raw.readingTime === "number" ? raw.readingTime : null,
      access:       raw.access === "paid" ? "paid" : "free",
      viewsCount:   Number(raw.viewsCount   || 0),
      likesCount:   Number(raw.likesCount   || 0),
      commentsCount:Number(raw.commentsCount || 0),
      savesCount:   Number(raw.savesCount   || 0),
      publishedAt:  raw.publishedAt instanceof Date ? raw.publishedAt.toISOString() : null,
      isFeatured:   !!raw.isFeatured,
      seriesId:     raw.seriesId ? String(raw.seriesId) : null,
      seriesOrder:  raw.seriesOrder ?? null,
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



/** Get user's liked/saved state for this post */
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
      {/*
        Scoped styles for Tiptap-specific HTML output that Tailwind prose
        and arbitrary variants cannot reliably target:

        1. TextAlign extension — outputs style="text-align: X" on p/h1/h2/h3.
           Tailwind JIT can't match partial inline style strings at runtime.

        2. Highlight extension — outputs <mark>. prose doesn't style <mark>
           by default so highlights are invisible without this.

        3. Lists — prose resets them; re-declare disc/decimal so they match
           exactly what the editor shows.

        4. Images inside centred paragraphs — honour the parent alignment.

        5. Nested list styles — circle → square for depth 2 → 3.
      */}
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

function AuthorChip({ id, name, username, avatar, label }: {
  id: string; name: string; username: string; avatar: string; label?: string;
}) {
  const href = username ? `/profile/${username}` : "#";
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span>
        {label && <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>}
        <span className="block text-sm font-semibold text-foreground group-hover:text-primary">{name}</span>
        {username && <span className="block text-xs text-muted-foreground">@{username}</span>}
      </span>
    </Link>
  );
}

function AuthorBioCard({ post }: { post: FullPost }) {
  return (
    <div className="mt-12 space-y-4">
      {/* Main author */}
      <PersonBioCard
        label="Written by"
        name={post.author.name}
        username={post.author.username}
        avatar={post.author.avatar}
        bio={post.author.bio}
      />

      {/* Co-authors — same card treatment, each linking to their own profile */}
      {post.coAuthors.map((ca) => (
        <PersonBioCard
          key={ca.id}
          label="Co-author"
          name={ca.name}
          username={ca.username}
          avatar={ca.avatar}
          bio={ca.bio}
        />
      ))}
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
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex items-start gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Link href={href} className="font-heading text-base font-bold text-foreground hover:text-primary">
            {name}
          </Link>
          {username && <p className="text-xs text-muted-foreground">@{username}</p>}
          {bio && (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{bio}</p>
          )}
          <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            More by {name} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Utils ──────────────────────────────────────────────────────────────── */

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(date));
}

function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}