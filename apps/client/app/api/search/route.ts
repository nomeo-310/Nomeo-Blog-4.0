import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { connectDB } from "@/lib/connect-to-database";
import { getAuth } from "@/lib/auth";

/**
 * GET /api/search?q=...&type=all|story|author|tag|lounge&limit=20
 * --------------------------------------------------------------
 * Filter-BEFORE-search: the `type` scopes which collections we query, so we
 * never scan collections the user didn't ask for. Returns a unified result
 * shape the UI renders directly.
 *
 * Result item:
 *   { id, type, title, subtitle, category, preview, href }
 *
 * Notes:
 *   - Only public/visible content is returned (published posts, non-banned
 *     profiles, active topics/lounges).
 *   - Uses case-insensitive regex for now. For scale, swap to a text index
 *     ($text) or Atlas Search — the shape stays the same.
 */

export type SearchType = "all" | "story" | "author" | "tag" | "lounge";

interface SearchResult {
  id: string;
  type: "story" | "author" | "tag" | "lounge";
  title: string;
  subtitle: string;
  category: string;
  preview: string;
  href: string;
  /** author only — userId for ProfileConnectButton */
  userId?: string;
  /** author only — avatar URL for the preview card */
  avatar?: string;
}

const VALID_TYPES: SearchType[] = ["all", "story", "author", "tag", "lounge"];

/** Escape user input so it can't break the regex. */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const typeParam = (searchParams.get("type") || "all") as SearchType;
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    if (!q) {
      return Response.json({ results: [], counts: {} });
    }
    const type: SearchType = VALID_TYPES.includes(typeParam) ? typeParam : "all";

    await connectDB();
    const db = mongoose.connection.db!;
    const rx = new RegExp(escapeRegex(q), "i");

    // Resolve the current user (if any) so we can exclude them from their own
    // author/creator results. Best-effort: search still works when logged out.
    let currentUserId: ObjectId | null = null;
    try {
      const auth = await getAuth();
      const session = await auth.api.getSession({ headers: await headers() });
      if (session?.user?.id) currentUserId = new ObjectId(session.user.id);
    } catch {
      currentUserId = null;
    }

    const want = (t: SearchType) => type === "all" || type === t;
    const perType = type === "all" ? Math.ceil(limit / 4) : limit;

    const results: SearchResult[] = [];

    // ── Posts (stories) ───────────────────────────────────────────────
    if (want("story")) {
      const posts = await db
        .collection("posts")
        .find(
          { status: "published", $or: [{ title: rx }, { excerpt: rx }] },
          { projection: { title: 1, slug: 1, excerpt: 1, readingTime: 1, authorId: 1, publishedAt: 1 } }
        )
        .sort({ publishedAt: -1 })
        .limit(perType)
        .toArray();

      // Resolve author display names in one batch
      const authorIds = [...new Set(posts.map((p) => p.authorId).filter(Boolean))];
      const authors = authorIds.length
        ? await db
            .collection("profiles")
            .find({ userId: { $in: authorIds } }, { projection: { userId: 1, displayName: 1 } })
            .toArray()
        : [];
      const nameByUser = new Map(authors.map((a) => [String(a.userId), a.displayName as string]));

      for (const p of posts) {
        const author = nameByUser.get(String(p.authorId)) || "Unknown";
        const mins = p.readingTime ? `${p.readingTime} min read` : "";
        results.push({
          id: String(p._id),
          type: "story",
          title: p.title,
          subtitle: `by ${author}${mins ? ` • ${mins}` : ""}`,
          category: "Story",
          preview: p.excerpt || "",
          href: `/post/${p.slug}`,
        });
      }
    }

    // ── Authors (profiles) ────────────────────────────────────────────
    if (want("author")) {
      const authorFilter: Record<string, unknown> = {
        banStatus: { $ne: "banned" },
        $or: [{ displayName: rx }, { username: rx }, { bio: rx }],
      };
      // Don't surface the searcher to themselves (reader or creator).
      if (currentUserId) authorFilter.userId = { $ne: currentUserId };

      const profiles = await db
        .collection("profiles")
        .find(authorFilter, {
          projection: { userId: 1, username: 1, displayName: 1, bio: 1, followersCount: 1, creatorStatus: 1, profileImage: 1 },
        })
        .limit(perType)
        .toArray();

      for (const pr of profiles) {
        const followers = pr.followersCount ?? 0;
        const isCreator = pr.creatorStatus === "active";
        results.push({
          id: String(pr._id),
          type: "author",
          title: pr.displayName || pr.username,
          subtitle: `${formatCount(followers)} followers${isCreator ? " • Creator" : ""}`,
          category: isCreator ? "Creator" : "Reader",
          preview: pr.bio || "",
          href: `/profile/${pr.username}`,
          userId: String(pr.userId || pr._id),
          avatar: String(pr.profileImage?.url || ""),
        });
      }
    }

    // ── Topics (tags) ─────────────────────────────────────────────────
    if (want("tag")) {
      const topics = await db
        .collection("topics")
        .find(
          { status: "active", $or: [{ label: rx }, { slug: rx }, { aliases: rx }] },
          { projection: { slug: 1, label: 1, description: 1, postsCount: 1 } }
        )
        .sort({ postsCount: -1 })
        .limit(perType)
        .toArray();

      for (const t of topics) {
        results.push({
          id: String(t._id),
          type: "tag",
          title: t.slug,
          subtitle: `${formatCount(t.postsCount ?? 0)} stories`,
          category: "Topic",
          preview: t.description || "",
          href: `/topic/${t.slug}`,
        });
      }
    }

    // ── Lounges ───────────────────────────────────────────────────────
    if (want("lounge")) {
      const lounges = await db
        .collection("lounges")
        .find(
          { status: "active", $or: [{ name: rx }, { description: rx }] },
          { projection: { name: 1, slug: 1, description: 1, memberCount: 1 } }
        )
        .limit(perType)
        .toArray();

      for (const l of lounges) {
        results.push({
          id: String(l._id),
          type: "lounge",
          title: l.name,
          subtitle: `${formatCount(l.memberCount ?? 0)} members`,
          category: "Lounge",
          preview: l.description || "",
          href: l.slug ? `/lounge/${l.slug}` : `/lounge/${l._id}`,
        });
      }
    }

    // ── Per-type counts for the filter pill badges ────────────────────
    // Only computed when scope is "all" (when scoped, the single count is
    // results.length). Cheap countDocuments per collection.
    let counts: Record<string, number> = {};
    if (type === "all") {
      const authorCountFilter: Record<string, unknown> = {
        banStatus: { $ne: "banned" },
        $or: [{ displayName: rx }, { username: rx }, { bio: rx }],
      };
      if (currentUserId) authorCountFilter.userId = { $ne: currentUserId };

      const [story, author, tag, lounge] = await Promise.all([
        db.collection("posts").countDocuments({ status: "published", $or: [{ title: rx }, { excerpt: rx }] }),
        db.collection("profiles").countDocuments(authorCountFilter),
        db.collection("topics").countDocuments({ status: "active", $or: [{ label: rx }, { slug: rx }, { aliases: rx }] }),
        db.collection("lounges").countDocuments({ status: "active", $or: [{ name: rx }, { description: rx }] }),
      ]);
      counts = { all: story + author + tag + lounge, story, author, tag, lounge };
    } else {
      counts = { [type]: results.length };
    }

    return Response.json({ results, counts });
  } catch (error) {
    console.error("[GET /api/search]", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}