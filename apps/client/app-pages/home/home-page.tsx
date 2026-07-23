import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getVisitorKey } from "@/lib/visitor-key";
import { selectAdvertsForPlacement } from "@/services/advert-services";
import { BlogSection } from "./blog-section";
import { HeroCarousel } from "./hero-carousel";
import { AdvertCTA } from "./home-advert-cta";
import { HomeRecommended } from "./home-recommended";
import type { HomePost, HeroSlide, PageData } from "./home-types";

// How many "Recommended for you" rows to show.
const RECOMMENDED_LIMIT = 5;
// How many slides the hero carousel shows, whichever source fills it.
const HERO_LIMIT = 5;

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
 *   3. Hero is now a carousel (see hero-carousel.tsx): live "hero"-placement
 *      adverts win the slot when any are eligible for the viewer, otherwise
 *      it falls back to the top HERO_LIMIT trending posts (same weighted
 *      score as before: views×0.4 + likes×0.4 + recency×0.2, from the last
 *      30 published posts). Dot indicators, auto-advance, pause-on-hover.
 *   4. Hero stats — views, likes, comments, saves shown in the overlay.
 *   5. Responsive page size — the blog grid now shows 4 posts per page on
 *      mobile/tablet, 6 on large screens, and 8 on 2xl. The server can't
 *      see the viewport, so PAGE_SIZE below is only the mobile-first
 *      default used for the very first paint; BlogSection resolves the
 *      real value on mount and refetches if the breakpoint guess was
 *      wrong. See blog-section.tsx for details.
 *
 * Layout is composed from sibling sub-components in this same folder
 * (home-hero, home-advert-cta, blog-section); this file owns the data
 * layer (below) and the top-level composition only.
 *
 * Route: app/page.tsx
 */

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

  // Recommendations are personal — only worth fetching for a signed-in
  // reader on the plain, unfiltered first page (same guard the feed_card
  // advert slot uses in blog-grid.tsx).
  const wantsRecommended = !!user && page === 1 && !query && !category;

  const visitorKey = user ? null : await getVisitorKey();

  const [data, recommendedRaw, promotedSlides] = await Promise.all([
    getPageData({ query, category, sort, page }),
    wantsRecommended ? getRecommendedPosts(user.id) : Promise.resolve([]),
    getHeroPromotedSlides({ userId: user?.id ?? null, visitorKey }),
  ]);

  // Admin-promoted posts get pinned first (in priority/weight order, already
  // sorted by selectAdvertsForPlacement); trending posts fill whatever's
  // left up to HERO_LIMIT, so "only one post is promoted" still yields a
  // full carousel rather than a lonely single slide.
  const promotedPostIds = new Set(promotedSlides.map((s) => s.post.id));
  const trendingFill = data.heroTrendingPosts
    .filter((p) => !promotedPostIds.has(p.id))
    .slice(0, Math.max(0, HERO_LIMIT - promotedSlides.length));

  const heroSlides: HeroSlide[] = [
    ...promotedSlides.map((s) => ({ post: s.post, promotedAdvertId: s.advertId })),
    ...trendingFill.map((post) => ({ post, promotedAdvertId: null })),
  ];

  const heroPostIds = new Set(heroSlides.map((s) => s.post.id));

  // Exclude whatever landed in the hero carousel so it isn't duplicated
  // immediately below itself.
  const recommended = recommendedRaw
    .filter((p) => !heroPostIds.has(p.id))
    .slice(0, RECOMMENDED_LIMIT);

  return (
    <div className="w-full bg-background pb-24">

      {/* ── 1. Hero ────────────────────────────────────────────────────── */}
      <HeroCarousel slides={heroSlides} user={user} />

      {/* ── 2. Recommended for you — personalized, signed-in readers only ── */}
      <HomeRecommended posts={recommended} />

      {/* ── 3. Blog section — client component so search/filter/pagination
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

      {/* ── 4. CTA / Advert ──────────────────────────────────────────── */}
      <AdvertCTA totalPosts={data.total} lounges={data.lounges} />
    </div>
  );
}

/* ── Data layer ─────────────────────────────────────────────────────────── */

async function getPageData({ query, category, sort, page }: {
  query: string; category: string; sort: string; page: number;
}): Promise<PageData> {
  const empty: PageData = { heroTrendingPosts: [], posts: [], lounges: [], categories: [], total: 0 };
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return empty;

    const base = { status: "published", isRemoved: { $ne: true } };

    // ── Hero fallback pool: weighted score from last 30 published posts ──
    // score = viewsCount × 0.4 + likesCount × 0.4 + recency bonus × 0.2
    // Recency bonus: posts published in the last 7 days get +1000 views equivalent.
    // Top HERO_LIMIT feed the carousel when no sponsored "hero" advert is live.
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
        // Small buffer above HERO_LIMIT: a promoted post may also rank as
        // organically trending, in which case it's deduped out and the next
        // one down fills the carousel instead of coming up short.
        { $limit: HERO_LIMIT + 3 },
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

    return {
      heroTrendingPosts: heroRaw.map((p: any) => shapePost(p, profileMap)),
      posts:      postsRaw.map((p: any) => shapePost(p, profileMap)),
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

/** Shared by getPageData (hero + grid) and getRecommendedPosts. */
function shapePost(p: any, profileMap: Map<string, any>): HomePost {
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
}

/**
 * getRecommendedPosts — published posts whose tags intersect the reader's
 * onboarding interests (Profile.interests). Returns [] for readers with no
 * interests set yet, or no matches — the caller (HomeRecommended) renders
 * nothing in that case rather than showing an empty section.
 */
async function getRecommendedPosts(userId: string): Promise<HomePost[]> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];

    const uid = new mongoose.Types.ObjectId(userId);
    const profile = await db.collection("profiles").findOne(
      { userId: uid },
      { projection: { interests: 1 } }
    );
    const interests: string[] = Array.isArray(profile?.interests) ? profile.interests : [];
    if (interests.length === 0) return [];

    // Fetch a small buffer above the display limit — the caller may drop
    // one (the hero, if it happens to also match) before slicing to size.
    const raw = await db.collection("posts")
      .find(
        { status: "published", isRemoved: { $ne: true }, tags: { $in: interests } },
        { projection: heroProjejction }
      )
      .sort({ publishedAt: -1 })
      .limit(RECOMMENDED_LIMIT + 1)
      .toArray();

    if (raw.length === 0) return [];

    const authorIds = [...new Set(
      raw.map((p: any) => String(p.authorId || "")).filter((id) => mongoose.Types.ObjectId.isValid(id))
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

    return raw.map((p: any) => shapePost(p, profileMap));
  } catch (err) {
    console.error("[HomePage] getRecommendedPosts failed", err);
    return [];
  }
}

/**
 * getHeroPromotedSlides — posts an admin has promoted into the hero slot
 * (live "hero"-placement Adverts, each with a postId; audience/schedule/
 * frequency-cap already applied by selectAdvertsForPlacement), in priority
 * order. Hero is reserved for real posts, so this fetches the POST's actual
 * data (title, cover image, author, stats) rather than rendering separate
 * ad creative — the slide looks and reads exactly like an organic trending
 * slide, just tagged `promotedAdvertId` for tracking. An advert whose post
 * got unpublished/deleted since being promoted is skipped, not errored.
 */
async function getHeroPromotedSlides({ userId, visitorKey }: {
  userId: string | null; visitorKey: string | null;
}): Promise<Array<{ post: HomePost; advertId: string }>> {
  try {
    await connectDB();
    const adverts = await selectAdvertsForPlacement({ placement: "hero", userId, visitorKey }, HERO_LIMIT);
    const withPostId = adverts.filter((a) => a.postId);
    if (withPostId.length === 0) return [];

    const db = mongoose.connection.db;
    if (!db) return [];

    const postIds = withPostId.map((a) => a.postId!);
    const postsRaw = await db.collection("posts")
      .find({ _id: { $in: postIds }, status: "published", isRemoved: { $ne: true } }, { projection: heroProjejction })
      .toArray();
    const postById = new Map(postsRaw.map((p: any) => [String(p._id), p]));

    const authorIds = [...new Set(
      postsRaw.map((p: any) => String(p.authorId || "")).filter((id) => mongoose.Types.ObjectId.isValid(id))
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

    const slides: Array<{ post: HomePost; advertId: string }> = [];
    for (const advert of withPostId) {
      const raw = postById.get(String(advert.postId));
      if (!raw) continue;
      slides.push({ post: shapePost(raw, profileMap), advertId: String(advert._id) });
    }
    return slides;
  } catch (err) {
    console.error("[HomePage] getHeroPromotedSlides failed", err);
    return [];
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
