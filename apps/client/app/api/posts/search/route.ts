// app/api/posts/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";

export const dynamic = "force-dynamic";

// Fallback only — used if the client doesn't send a `limit` (shouldn't
// normally happen, BlogSection always sends one). Kept modest and clamped
// below so a malformed/missing param can't be abused to pull huge pages.
const DEFAULT_PAGE_SIZE = 8;
const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 24;

function parsePageSize(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, n));
}

/**
 * GET /api/posts/search?q=&cat=&sort=&page=&limit=
 * --------------------------------------------------
 * Powers the client-side BlogSection search.
 * Searches: title, excerpt, category, tags, author name/username, co-author name/username.
 * `limit` is the responsive items-per-page from BlogSection (4 / 6 / 8
 * depending on breakpoint) — falls back to DEFAULT_PAGE_SIZE if absent
 * or invalid, and is clamped to [MIN_PAGE_SIZE, MAX_PAGE_SIZE].
 * Returns: { posts, total, categories }
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ posts: [], total: 0, categories: [] });

    const sp       = new URL(req.url).searchParams;
    const query    = (sp.get("q")    ?? "").trim();
    const category = (sp.get("cat")  ?? "").trim();
    const sort     = sp.get("sort") === "trending" ? "trending" : "newest";
    const page     = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = parsePageSize(sp.get("limit"));
    const skip     = (page - 1) * pageSize;

    const base: Record<string, unknown> = { status: "published", isRemoved: { $ne: true } };

    // Build filter
    const filter: Record<string, unknown> = { ...base };
    if (category) filter.category = category;

    if (query) {
      const rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      // Resolve matching author / co-author profile userIds
      const matchingProfiles = await db.collection("profiles")
        .find(
          { $or: [{ displayName: rx }, { username: rx }] },
          { projection: { userId: 1 } }
        )
        .limit(50)
        .toArray();
      const matchingIds = matchingProfiles.map((p: any) => p.userId);

      const orClauses: object[] = [
        { title: rx },
        { excerpt: rx },
        { category: rx },
        { tags: rx },
      ];
      if (matchingIds.length > 0) {
        orClauses.push(
          { authorId: { $in: matchingIds } },
          { "coAuthors.userId": { $in: matchingIds } }
        );
      }
      filter.$or = orClauses;
    }

    const sortSpec: Record<string, -1 | 1> = sort === "trending"
      ? { viewsCount: -1, likesCount: -1, commentsCount: -1, publishedAt: -1 }
      : { publishedAt: -1, createdAt: -1 };

    const [postsRaw, total, categoriesRaw] = await Promise.all([
      db.collection("posts")
        .find(filter, {
          projection: {
            title: 1, slug: 1, excerpt: 1, coverImage: 1, tags: 1, category: 1,
            readingTime: 1, access: 1, viewsCount: 1, commentsCount: 1,
            publishedAt: 1, createdAt: 1, authorId: 1,
          },
        })
        .sort(sortSpec)
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      db.collection("posts").countDocuments(filter),
      db.collection("posts").distinct("category", base),
    ]);

    // Batch-fetch author profiles
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

    const posts = postsRaw.map((p: any) => {
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
        viewsCount:   Number(p.viewsCount || 0),
        publishedAt:  p.publishedAt instanceof Date ? p.publishedAt.toISOString() : null,
        author: {
          name:     String(profile?.displayName || profile?.username || "Nomeo writer"),
          username: String(profile?.username || ""),
          avatar:   String(profile?.profileImage?.url || ""),
        },
      };
    });

    return NextResponse.json({
      posts,
      total,
      categories: (categoriesRaw as string[]).filter(Boolean).sort(),
    });
  } catch (err) {
    console.error("[GET /api/posts/search]", err);
    return NextResponse.json({ posts: [], total: 0, categories: [] }, { status: 500 });
  }
}