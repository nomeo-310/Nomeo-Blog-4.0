import Link from "next/link";
import mongoose from "mongoose";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock03Icon, ViewIcon, CircleLock02Icon, Edit01Icon, ArrowRight02Icon, Message01Icon, FavouriteIcon, Bookmark01Icon } from "@hugeicons/core-free-icons";
import { connectDB } from "@/lib/connect-to-database";
import { BlogSection } from "./blog-section";

/**
 * HomePage — Nomeo blog discovery.
 *
 * Changes from previous version:
 *   1. Search bar — visible input in the blog section header. Searches
 *      title, excerpt, category, tags, AND author name/username/co-authors
 *      via a profile lookup join.
 *   2. Hero visibility — bottom text area now sits on a guaranteed dark
 *      frosted panel (not relying on image darkness). Top badges use
 *      solid dark backdrops. Works on both light and dark cover images.
 *   3. Hero selection — weighted score (views×0.4 + likes×0.4 + recency×0.2)
 *      from the last 30 published posts, so trending posts get the hero slot.
 *   4. Hero stats — views, likes, comments, saves shown in the overlay.
 *   5. Responsive page size — the blog grid now shows 4 posts per page on
 *      mobile/tablet, 6 on large screens, and 8 on 2xl. The server can't
 *      see the viewport, so PAGE_SIZE below is only the mobile-first
 *      default used for the very first paint; BlogSection resolves the
 *      real value on mount and refetches if the breakpoint guess was
 *      wrong. See blog-section.tsx for details.
 *
 * Route: app/page.tsx
 */

/* ── Types ──────────────────────────────────────────────────────────────── */

type HomePost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: { secureUrl: string; publicId: string } | null;
  tags: string[];
  category: string;
  readingTime: number | null;
  access: "free" | "paid";
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  publishedAt: string | null;
  author: { name: string; username: string; avatar: string };
  externalUrl?: string;
};

type HomeLounge = {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  messagesCount: number;
};

type PageData = {
  hero: HomePost | null;
  posts: HomePost[];
  lounges: HomeLounge[];
  categories: string[];
  total: number;
};

// Mobile-first default for the initial server-rendered page. This is only
// a best-effort guess (the server has no way to know the viewport) — on
// large/2xl screens, BlogSection corrects this to 6 or 8 immediately after
// mount and refetches. Keep this in sync with getResponsivePageSize() in
// blog-section.tsx.
const PAGE_SIZE = 4;

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function HomePage({ searchParams, user }: {
  searchParams?: Promise<{ q?: string; cat?: string; sort?: string; page?: string }>;
  user?: any;
}) {
  const sp = await searchParams;
  const query    = (sp?.q   ?? "").trim();
  const category = (sp?.cat ?? "").trim();
  const sort     = sp?.sort === "trending" ? "trending" : "newest";
  const page     = Math.max(1, Number(sp?.page) || 1);

  const data = await getPageData({ query, category, sort, page });

  return (
    <div className="w-full bg-background pb-24">

      {/* ── 1. Hero ────────────────────────────────────────────────────── */}
      {data.hero ? <HeroPost post={data.hero} /> : <EmptyHero user={user} />}

      {/* ── 2. Blog section — client component so search/filter/pagination
            don't reload the page or jump back to the hero ─────────── */}
      <BlogSection
        initialPosts={data.posts}
        initialTotal={data.total}
        initialCategories={data.categories}
        initialQuery={query}
        initialCategory={category}
        initialSort={sort}
        initialPage={page}
        pageSize={PAGE_SIZE}
      />

      {/* ── 3. CTA / Advert ──────────────────────────────────────────── */}
      <AdvertCTA totalPosts={data.total} lounges={data.lounges} />
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────────── */

function HeroPost({ post }: { post: HomePost }) {
  return (
    <section className="relative mt-6 h-[85vh] min-h-[500px] w-full overflow-hidden rounded-2xl bg-muted lg:min-h-[550px] xl:min-h-[650px] 2xl:min-h-[700px]">
      {/* Cover image */}
      {post.coverImage?.secureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImage.secureUrl}
          alt=""
          loading="eager"
          className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
          <HugeiconsIcon icon={Edit01Icon} className="h-16 w-16 text-primary/20" />
        </div>
      )}

      {/* Full overlay — subtle dark tint over the entire image */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Bottom panel — solid frosted dark area, works on ANY image brightness */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pb-8 pt-32 sm:pb-10 sm:pt-40" />

      {/* ── Top-left: category badge ── */}
      {(post.category || post.tags[0]) && (
        <div className="absolute left-5 top-5">
          <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur-md">
            {post.category || post.tags[0]}
          </span>
        </div>
      )}

      {/* ── Top-right: author chip ── */}
      {post.author && (
        <div className="absolute right-5 top-5">
          <Link
            href={post.author.username ? `/profile/${post.author.username}` : "#"}
            className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur-md transition-all hover:bg-black/75"
          >
            {post.author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                {post.author.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs font-medium text-white">{post.author.name}</span>
            <HugeiconsIcon icon={ArrowRight02Icon} className="h-3 w-3 text-white/60" />
          </Link>
        </div>
      )}

      {/* ── Bottom content ── */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-8 text-white sm:px-8 sm:pb-10">
        <div className="mx-auto max-w-7xl">

          {/* Title */}
          <Link href={`/post/${post.slug}`} className="group block">
            <h1 className="max-w-3xl font-heading text-3xl font-bold leading-tight tracking-tight drop-shadow-sm transition-colors group-hover:text-white/85 sm:text-4xl md:text-5xl lg:text-6xl">
              {post.title}
            </h1>
          </Link>

          {post.excerpt && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              {post.excerpt}
            </p>
          )}

          {/* Meta row — date + reading time + stats */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70 sm:text-sm">
            {/* Date */}
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Clock03Icon} className="h-3.5 w-3.5" />
                {formatDate(post.publishedAt)}
              </span>
            )}
            {post.readingTime && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span>{post.readingTime} min read</span>
              </>
            )}

            {/* Divider */}
            <span className="h-1 w-1 rounded-full bg-white/30" />

            {/* Stats — views, likes, comments, saves */}
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={ViewIcon} className="h-3.5 w-3.5" />
              {formatCount(post.viewsCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={FavouriteIcon} className="h-3.5 w-3.5" />
              {formatCount(post.likesCount)}
            </span>
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Message01Icon} className="h-3.5 w-3.5" />
              {formatCount(post.commentsCount)}
            </span>
            {post.savesCount > 0 && (
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon icon={Bookmark01Icon} className="h-3.5 w-3.5" />
                {formatCount(post.savesCount)}
              </span>
            )}

            {post.access === "paid" && (
              <>
                <span className="h-1 w-1 rounded-full bg-white/30" />
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <HugeiconsIcon icon={CircleLock02Icon} className="h-3 w-3" /> Members
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyHero({ user }: { user?: any }) {
  return (
    <div className="relative mt-6 flex h-[70vh] min-h-[500px] w-full items-center justify-center overflow-hidden rounded-2xl bg-primary/20 lg:min-h-[550px] xl:min-h-[650px]">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl" style={{ animationDelay: "1s" }} />
      </div>
      <div className="relative z-10 max-w-2xl px-6 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/20">
          <HugeiconsIcon icon={Edit01Icon} className="h-12 w-12 text-primary/60" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/60">Welcome to Nomeo</p>
        <h1 className="mt-4 font-heading text-4xl font-bold text-foreground sm:text-5xl md:text-6xl">
          Stories worth reading.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
          The first published post will appear here. Start your writing journey today.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {user?.role === "creator" && (
            <Link href="/dashboard/posts/new"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <HugeiconsIcon icon={Edit01Icon} className="h-4 w-4" /> Write your first story
            </Link>
          )}
          <Link href="/about"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent">
            Learn more <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}


/* ── Advert CTA ─────────────────────────────────────────────────────────── */

function AdvertCTA({ totalPosts, lounges }: { totalPosts: number; lounges: HomeLounge[] }) {
  return (
    <section className="mt-20 px-4 md:px-0">
      <div className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="flex flex-col justify-between p-8 sm:p-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                <HugeiconsIcon icon={Message01Icon} className="h-3 w-3" /> Live now
              </span>
              <h3 className="mt-5 font-heading text-3xl font-bold leading-snug tracking-tight text-foreground sm:text-4xl">
                The conversation doesn&apos;t stop at the last paragraph.
              </h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Lounges are real-time rooms where readers and writers keep talking — open to everyone,
                or members-only for your favourite creators.
              </p>
              {lounges.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-6">
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">{lounges.length}+</p>
                    <p className="text-xs text-muted-foreground">Open lounges</p>
                  </div>
                  <div>
                    <p className="font-heading text-2xl font-bold text-foreground">
                      {lounges.reduce((s, l) => s + l.membersCount, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                  {totalPosts > 0 && (
                    <div>
                      <p className="font-heading text-2xl font-bold text-foreground">{totalPosts.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Articles</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/lounges"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Explore lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="border-t border-primary/10 p-6 lg:border-l lg:border-t-0 lg:p-8">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">Happening right now</p>
            {lounges.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12 text-center">
                <div>
                  <HugeiconsIcon icon={Message01Icon} className="mx-auto h-8 w-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">Lounges opening soon.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lounges.slice(0, 4).map((l) => (
                  <Link key={l.id} href={`/lounges/${l.id}`}
                    className="group flex items-start gap-3 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground group-hover:text-primary">{l.name}</p>
                      {l.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{l.description}</p>}
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{l.membersCount.toLocaleString()} members</span>
                        <span>{l.messagesCount.toLocaleString()} messages</span>
                      </div>
                    </div>
                    <HugeiconsIcon icon={ArrowRight02Icon} className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary" />
                  </Link>
                ))}
                <Link href="/lounges" className="flex w-full items-center justify-center gap-1 pt-2 text-sm font-semibold text-primary hover:underline">
                  See all lounges <HugeiconsIcon icon={ArrowRight02Icon} className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Data layer ─────────────────────────────────────────────────────────── */

async function getPageData({ query, category, sort, page }: {
  query: string; category: string; sort: string; page: number;
}): Promise<PageData> {
  const empty: PageData = { hero: null, posts: [], lounges: [], categories: [], total: 0 };
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return empty;

    const base = { status: "published", isRemoved: { $ne: true } };

    // ── Hero: weighted score from last 30 published posts ───────────────
    // score = viewsCount × 0.4 + likesCount × 0.4 + recency bonus × 0.2
    // Recency bonus: posts published in the last 7 days get +1000 views equivalent
    const heroRaw = await db.collection("posts")
      .aggregate([
        { $match: base },
        { $sort: { publishedAt: -1 } },
        { $limit: 30 },
        {
          $addFields: {
            recencyBonus: {
              $cond: {
                if: { $gte: ["$publishedAt", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                then: 1000,
                else: 0,
              },
            },
          },
        },
        {
          $addFields: {
            heroScore: {
              $add: [
                { $multiply: [{ $ifNull: ["$viewsCount", 0] }, 0.4] },
                { $multiply: [{ $ifNull: ["$likesCount", 0] }, 0.4] },
                { $multiply: ["$recencyBonus", 0.2] },
              ],
            },
          },
        },
        { $sort: { heroScore: -1 } },
        { $limit: 1 },
        { $project: heroProjejction },
      ])
      .toArray();

    // ── Posts filter — extends search to author + co-author names ───────
    const filter: Record<string, unknown> = { ...base };
    if (category) filter.category = category;

    if (query) {
      const rx = new RegExp(escapeRegex(query), "i");

      // Find matching author/co-author profile userIds first
      const matchingProfiles = await db.collection("profiles")
        .find(
          { $or: [{ displayName: rx }, { username: rx }] },
          { projection: { userId: 1 } }
        )
        .limit(50)
        .toArray();
      const matchingUserIds = matchingProfiles.map((p: any) => p.userId);

      const orClauses: object[] = [
        { title: rx },
        { excerpt: rx },
        { category: rx },
        { tags: rx },
      ];
      if (matchingUserIds.length > 0) {
        orClauses.push(
          { authorId: { $in: matchingUserIds } },
          { "coAuthors.userId": { $in: matchingUserIds } }
        );
      }
      filter.$or = orClauses;
    }

    const sortSpec: Record<string, -1 | 1> = sort === "trending"
      ? { viewsCount: -1, likesCount: -1, commentsCount: -1, publishedAt: -1 }
      : { publishedAt: -1, createdAt: -1 };

    const skip = (page - 1) * PAGE_SIZE;

    const [postsRaw, total, categoriesRaw, loungesRaw] = await Promise.all([
      db.collection("posts")
        .find(filter, { projection: postProjection })
        .sort(sortSpec)
        .skip(skip)
        .limit(PAGE_SIZE)
        .toArray(),

      db.collection("posts").countDocuments(filter),

      db.collection("posts").distinct("category", base),

      db.collection("lounges")
        .find({ kind: "platform", status: "active", isSuspended: { $ne: true } })
        .sort({ membersCount: -1 })
        .limit(4)
        .project({ _id: 1, name: 1, description: 1, membersCount: 1, messagesCount: 1 })
        .toArray(),
    ]);

    // Batch-fetch author profiles
    const allPosts = [...heroRaw, ...postsRaw];
    const authorIds = [...new Set(
      allPosts.map((p: any) => String(p.authorId || "")).filter((id) => mongoose.Types.ObjectId.isValid(id))
    )];
    const profiles = authorIds.length
      ? await db.collection("profiles")
          .find(
            { userId: { $in: authorIds.map((id) => new mongoose.Types.ObjectId(id)) } },
            { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1 } }
          )
          .toArray()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    const shape = (p: any): HomePost => {
      const profile = profileMap.get(String(p.authorId));
      return {
        id:           String(p._id),
        title:        String(p.title || "Untitled"),
        slug:         String(p.slug || p._id),
        excerpt:      String(p.excerpt || ""),
        coverImage:   p.coverImage?.secureUrl
          ? { secureUrl: p.coverImage.secureUrl, publicId: p.coverImage.publicId || "" }
          : null,
        tags:         Array.isArray(p.tags) ? p.tags.map(String).filter(Boolean).slice(0, 2) : [],
        category:     String(p.category || ""),
        readingTime:  typeof p.readingTime === "number" ? p.readingTime : null,
        access:       p.access === "paid" ? "paid" : "free",
        viewsCount:   Number(p.viewsCount   || 0),
        likesCount:   Number(p.likesCount   || 0),
        commentsCount:Number(p.commentsCount || 0),
        savesCount:   Number(p.savesCount   || 0),
        publishedAt:  p.publishedAt instanceof Date ? p.publishedAt.toISOString() : null,
        author: {
          name:     String(profile?.displayName || profile?.username || "Nomeo writer"),
          username: String(profile?.username || ""),
          avatar:   String(profile?.profileImage?.url || ""),
        },
        externalUrl: p.externalUrl || undefined,
      };
    };

    return {
      hero:       heroRaw[0] ? shape(heroRaw[0]) : null,
      posts:      postsRaw.map(shape),
      lounges:    loungesRaw.map((l: any) => ({
        id:           String(l._id),
        name:         String(l.name || ""),
        description:  String(l.description || ""),
        membersCount: Number(l.membersCount  || 0),
        messagesCount:Number(l.messagesCount || 0),
      })),
      categories: (categoriesRaw as string[]).filter(Boolean).sort(),
      total,
    };
  } catch (err) {
    console.error("[HomePage] failed to load", err);
    return empty;
  }
}

// Hero needs all stats for the overlay
const heroProjejction = {
  title: 1, slug: 1, excerpt: 1, coverImage: 1, tags: 1, category: 1,
  readingTime: 1, access: 1, viewsCount: 1, likesCount: 1,
  commentsCount: 1, savesCount: 1, publishedAt: 1, authorId: 1, externalUrl: 1,
};

// Grid cards only need view count (likes/saves shown on hover in post page)
const postProjection = {
  title: 1, slug: 1, excerpt: 1, coverImage: 1, tags: 1, category: 1,
  readingTime: 1, access: 1, viewsCount: 1, commentsCount: 1,
  publishedAt: 1, createdAt: 1, authorId: 1, externalUrl: 1,
};

/* ── Utils ──────────────────────────────────────────────────────────────── */

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}