import Link from "next/link";
import mongoose from "mongoose";
import { Plus } from "lucide-react";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/features/dashboard-layout";
import { PostsGrid } from "@/app-pages/dashboard/posts/posts-grid";

export const metadata: Metadata = { title: "Posts" };

/**
 * PostsPage — creator-only dashboard page showing all their posts + series.
 *
 * Two tabs (Posts | Series) rendered client-side via PostsGrid island.
 * Grid: 1 col mobile → 2 tablet → 3 lg → 4 xl.
 * Each card has a dropdown: Edit · Unpublish/Publish · Delete.
 *
 * Route: app/dashboard/posts/page.tsx
 */
export default async function PostsPage() {
  
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  const [posts, series] = await Promise.all([
    getMyPosts(user.id),
    getMySeries(user.id),
  ]);

  const published = posts.filter(p => p.status === "published").length;
  const drafts    = posts.filter(p => p.status === "draft").length;

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Posts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {published} published · {drafts} {drafts === 1 ? "draft" : "drafts"} · {series.length} {series.length === 1 ? "series" : "series"}
            </p>
          </div>
          <Link
            href="/dashboard/posts/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New post
          </Link>
        </div>

        {/* Client island — handles tabs, dropdown actions, grid */}
        <PostsGrid initialPosts={posts} initialSeries={series} />
      </div>
    </DashboardLayout>
  );
}

/* ── Data layer ─────────────────────────────────────────────────────────── */

export type DashboardPost = {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  status: string;
  access: "free" | "paid";
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  publishedAt: string | null;
  seriesTitle: string | null;
};

export type DashboardSeries = {
  id: string;
  title: string;
  description: string;
  postsCount: number;
  isPublished: boolean;
  coverImage: string;
  createdAt: string;
};

async function getMyPosts(userId: string): Promise<DashboardPost[]> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];

    const raw = await db.collection("posts")
      .find({ authorId: new mongoose.Types.ObjectId(userId), isRemoved: { $ne: true } })
      .project({
        title: 1, slug: 1, coverImage: 1, status: 1, access: 1,
        viewsCount: 1, likesCount: 1, commentsCount: 1,
        publishedAt: 1, seriesId: 1,
      })
      .sort({ updatedAt: -1 })
      .limit(200)
      .toArray();

    // Resolve series titles in one batch
    const seriesIds = [...new Set(
      raw.filter((p: any) => p.seriesId).map((p: any) => String(p.seriesId))
    )];
    const seriesMap = new Map<string, string>();
    if (seriesIds.length) {
      const seriesDocs = await db.collection("post_series")
        .find({ _id: { $in: seriesIds.map(id => new mongoose.Types.ObjectId(id)) } })
        .project({ title: 1 })
        .toArray();
      seriesDocs.forEach((s: any) => seriesMap.set(String(s._id), String(s.title)));
    }

    return raw.map((p: any) => ({
      id:           String(p._id),
      title:        String(p.title || "Untitled"),
      slug:         String(p.slug  || p._id),
      coverImage:   String(p.coverImage?.secureUrl || p.coverImage?.url || ""),
      status:       String(p.status),
      access:       p.access === "paid" ? "paid" : "free",
      viewsCount:   Number(p.viewsCount   || 0),
      likesCount:   Number(p.likesCount   || 0),
      commentsCount:Number(p.commentsCount || 0),
      publishedAt:  p.publishedAt instanceof Date ? p.publishedAt.toISOString() : null,
      seriesTitle:  p.seriesId ? (seriesMap.get(String(p.seriesId)) ?? null) : null,
    }));
  } catch { return []; }
}

async function getMySeries(userId: string): Promise<DashboardSeries[]> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];

    const raw = await db.collection("post_series")
      .find({ creatorId: new mongoose.Types.ObjectId(userId) })
      .project({ title: 1, description: 1, postsCount: 1, isPublished: 1, coverImage: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    return raw.map((s: any) => ({
      id:          String(s._id),
      title:       String(s.title || "Untitled series"),
      description: String(s.description || ""),
      postsCount:  Number(s.postsCount || 0),
      isPublished: Boolean(s.isPublished),
      coverImage:  String(s.coverImage?.secureUrl || s.coverImage?.url || ""),
      createdAt:   s.createdAt instanceof Date ? s.createdAt.toISOString() : new Date().toISOString(),
    }));
  } catch { return []; }
}