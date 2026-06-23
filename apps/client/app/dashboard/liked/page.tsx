import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/features/dashboard-layout";
import { HugeiconsIcon } from "@hugeicons/react";
import { FavouriteIcon, Clock03Icon, CircleLock02Icon, Edit01Icon } from "@hugeicons/core-free-icons";

export const metadata: Metadata = {
  title: 'Liked Posts',
}

/** Route: app/dashboard/liked/page.tsx */
export default async function Liked() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  const posts = await getLikedPosts(user.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Liked posts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Posts you've liked.</p>
        </div>
        {posts.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <HugeiconsIcon icon={FavouriteIcon} className="h-8 w-8 text-muted-foreground/30" />
            </span>
            <h3 className="mt-4 font-heading text-base font-bold text-foreground">No liked posts yet</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">Like a post while reading and it'll appear here.</p>
            <Link href="/" className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Discover posts</Link>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {posts.map((p) => (
              <article key={p.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                <Link href={`/post/${p.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
                  {p.coverImage
                    ? <img src={p.coverImage} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"><HugeiconsIcon icon={Edit01Icon} className="h-7 w-7 text-primary/30" /></div>}
                  {p.access === "paid" && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                      <HugeiconsIcon icon={CircleLock02Icon} className="h-3 w-3 text-primary" /> Members
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link href={`/post/${p.slug}`}>
                    <h3 className="line-clamp-2 font-heading text-base font-bold text-card-foreground transition-colors group-hover:text-primary">{p.title}</h3>
                  </Link>
                  {p.excerpt && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{p.excerpt}</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-xs text-muted-foreground">
                    <span>{p.authorName}</span>
                    {p.readingTime && <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Clock03Icon} className="h-3 w-3" />{p.readingTime} min</span>}
                    <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={FavouriteIcon} className="h-3 w-3 text-rose-400" />{p.likesCount.toLocaleString()}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

async function getLikedPosts(userId: string) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];
    const uid = new mongoose.Types.ObjectId(userId);
    const reactions = await db.collection("reactions")
      .find({ userId: uid, targetType: "post" }, { projection: { targetId: 1 } })
      .sort({ createdAt: -1 }).limit(48).toArray();
    if (!reactions.length) return [];
    const postIds = reactions.map((r: any) => r.targetId);
    const posts = await db.collection("posts")
      .find({ _id: { $in: postIds }, status: "published", isRemoved: { $ne: true } })
      .project({ title: 1, slug: 1, excerpt: 1, coverImage: 1, readingTime: 1, access: 1, likesCount: 1, authorId: 1 })
      .toArray();
    const authorIds = posts.map((p: any) => p.authorId).filter(Boolean);
    const profiles = authorIds.length ? await db.collection("profiles").find({ userId: { $in: authorIds } }, { projection: { userId: 1, displayName: 1, username: 1 } }).toArray() : [];
    const pm = new Map(profiles.map((p: any) => [String(p.userId), p]));
    return posts.map((p: any) => ({
      id: String(p._id), title: String(p.title || "Untitled"), slug: String(p.slug || p._id),
      excerpt: String(p.excerpt || ""), coverImage: String(p.coverImage.secureUrl || p.coverImage.url || ""),
      readingTime: p.readingTime ?? null, access: p.access === "paid" ? "paid" : "free" as "free" | "paid",
      likesCount: Number(p.likesCount || 0),
      authorName: String(pm.get(String(p.authorId))?.displayName || "Nomeo writer"),
    }));
  } catch { return []; }
}