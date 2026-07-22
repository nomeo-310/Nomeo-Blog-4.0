import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { BlogSection } from "./blog-section";
import { HeroPost, EmptyHero } from "./home-hero";
import { AdvertCTA } from "./home-advert-cta";
import { HomeRecommended } from "./home-recommended";
import type { HomePost, PageData } from "./home-types";

// How many "Recommended for you" rows to show.
const RECOMMENDED_LIMIT = 5;

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

  const [data, recommendedRaw] = await Promise.all([
    getPageData({ query, category, sort, page }),
    wantsRecommended ? getRecommendedPosts(user.id) : Promise.resolve([]),
  ]);

  // Exclude whatever landed in the hero slot so it isn't duplicated
  // immediately below itself.
  const recommended = recommendedRaw
    .filter((p) => p.id !== data.hero?.id)
    .slice(0, RECOMMENDED_LIMIT);

  return (
    <div className="w-full bg-background pb-24">

      {/* ── 1. Hero ────────────────────────────────────────────────────── */}
      {data.hero ? <HeroPost post={data.hero} /> : <EmptyHero user={user} />}

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

    return {
      hero:       heroRaw[0] ? shapePost(heroRaw[0], profileMap) : null,
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
