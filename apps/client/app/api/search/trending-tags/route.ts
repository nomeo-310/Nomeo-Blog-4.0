// app/api/search/trending-tags/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/trending-tags
 * ------------------------------
 * Returns the top 12 most-used tags across all published posts.
 *
 * Caching strategy — stored in a `cache` collection in MongoDB:
 *   { key: "trending_tags", data: [...], expiresAt: Date }
 *
 * Why MongoDB cache instead of Next.js revalidate or Redis?
 *   • No extra infrastructure needed (reuses your existing DB connection)
 *   • Works across multiple server instances / edge deployments
 *   • The aggregation itself is O(n tags) — cheap, but runs every request
 *     without caching on a busy site. 10-minute TTL is a good balance.
 *
 * Cache miss path (cold or expired):
 *   1. Aggregate tags from all published posts
 *   2. Sort by post count descending, take top 12
 *   3. Write to cache with expiresAt = now + 10 min
 *   4. Return tags
 *
 * Cache hit path:
 *   1. Read from cache collection
 *   2. Return immediately — no aggregation
 */

const CACHE_KEY = "trending_tags";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in ms
const TAG_LIMIT = 12;

export async function GET() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ tags: [] }, { status: 503 });

    // ── 1. Check cache ───────────────────────────────────────────────────
    const cached = await db.collection("cache").findOne({ key: CACHE_KEY });
    if (cached && cached.expiresAt > new Date()) {
      return NextResponse.json(
        { tags: cached.data, source: "cache" },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }

    // ── 2. Aggregate top tags from published posts ───────────────────────
    const pipeline = [
      // Only published, non-removed posts with at least one tag
      { $match: { status: "published", isRemoved: { $ne: true }, tags: { $exists: true, $ne: [] } } },
      // Unwind the tags array so each tag becomes its own document
      { $unwind: "$tags" },
      // Normalise: lowercase, trim
      { $project: { tag: { $toLower: { $trim: { input: "$tags" } } } } },
      // Count occurrences per tag
      { $group: { _id: "$tag", count: { $sum: 1 } } },
      // Only tags that appear in at least 2 posts (avoids one-off noise)
      { $match: { count: { $gte: 1 } } },
      // Most popular first
      { $sort: { count: -1 } },
      { $limit: TAG_LIMIT },
      // Return as { tag, count }
      { $project: { _id: 0, tag: "$_id", count: 1 } },
    ];

    const rows = await db.collection("posts").aggregate(pipeline).toArray();
    const tags: string[] = rows.map((r: any) => r.tag);

    // ── 3. Write / refresh cache ─────────────────────────────────────────
    await db.collection("cache").updateOne(
      { key: CACHE_KEY },
      {
        $set: {
          key:       CACHE_KEY,
          data:      tags,
          expiresAt: new Date(Date.now() + CACHE_TTL),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json(
      { tags, source: "fresh" },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (err) {
    console.error("[GET /api/search/trending-tags]", err);
    return NextResponse.json({ tags: [] }, { status: 500 });
  }
}