import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/features/dashboard-layout";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, Clock03Icon, CircleLock02Icon, Edit01Icon, Bookmark01Icon } from "@hugeicons/core-free-icons";

export const metadata: Metadata = {
  title: 'Saved Posts',
}

/** Route: app/dashboard/saved/page.tsx */
export default async function SavedPostsPage() {

  const user = await getCurrentUser();
  if (!user) redirect("/");

  const posts = await getSavedPosts(user.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Saved posts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Posts you've bookmarked to read later.</p>
        </div>

        {posts.length === 0 ? (
          <EmptyState
            icon={<HugeiconsIcon icon={Bookmark01Icon} className="h-8 w-8 text-muted-foreground/30" />}
            title="Nothing saved yet"
            body="When you save a post, it'll show up here so you can come back to it."
            action={{ label: "Discover posts", href: "/" }}
          />
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

async function getSavedPosts(userId: string) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];
    const uid = new mongoose.Types.ObjectId(userId);

    const saved = await db.collection("saved_posts")
      .find({ userId: uid }, { projection: { postId: 1, createdAt: 1 } })
      .sort({ createdAt: -1 }).limit(48).toArray();

    if (!saved.length) return [];
    const postIds = saved.map((s: any) => s.postId);

    const posts = await db.collection("posts")
      .find({ _id: { $in: postIds }, status: "published", isRemoved: { $ne: true } })
      .project({ title: 1, slug: 1, excerpt: 1, coverImage: 1, tags: 1, readingTime: 1, access: 1, viewsCount: 1, publishedAt: 1, authorId: 1 })
      .toArray();

    const authorIds = posts.map((p: any) => p.authorId).filter(Boolean);
    const profiles = authorIds.length
      ? await db.collection("profiles")
          .find({ userId: { $in: authorIds } }, { projection: { userId: 1, displayName: 1, username: 1 } })
          .toArray()
      : [];
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    return posts.map((p: any) => {
      const author = profileMap.get(String(p.authorId));
      return {
        id: String(p._id),
        title: String(p.title || "Untitled"),
        slug: String(p.slug || p._id),
        excerpt: String(p.excerpt || ""),
        coverImage: String(p.coverImage.secureUrl || p.coverImage.url || ""),
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 2) : [],
        readingTime: p.readingTime ?? null,
        access: p.access === "paid" ? "paid" : "free" as "free" | "paid",
        viewsCount: Number(p.viewsCount || 0),
        publishedAt: p.publishedAt instanceof Date ? p.publishedAt.toISOString() : null,
        authorName: String(author?.displayName || author?.username || "Nomeo writer"),
        authorUsername: String(author?.username || ""),
      };
    });
  } catch { return []; }
}

type SavedPost = Awaited<ReturnType<typeof getSavedPosts>> extends Array<infer U> ? U : never;

function PostCard({ post }: { post: SavedPost }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
      <Link href={`/post/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {post.coverImage
          ? <img src={post.coverImage} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"><HugeiconsIcon icon={Edit01Icon} className="h-7 w-7 text-primary/30" /></div>}
        {post.access === "paid" && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            <HugeiconsIcon icon={CircleLock02Icon} className="h-3 w-3 text-primary" /> Members
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {post.tags.length > 0 && (
          <div className="mb-2 flex gap-1.5">{post.tags.map((t: string) => <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">#{t}</span>)}</div>
        )}
        <Link href={`/post/${post.slug}`}>
          <h3 className="line-clamp-2 font-heading text-base font-bold text-card-foreground transition-colors group-hover:text-primary">{post.title}</h3>
        </Link>
        {post.excerpt && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-xs text-muted-foreground">
          {post.authorUsername
            ? <Link href={`/profile/${post.authorUsername}`} className="hover:text-primary">{post.authorName}</Link>
            : <span>{post.authorName}</span>}
          {post.readingTime && <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={Clock03Icon} className="h-3 w-3" />{post.readingTime} min</span>}
          <span className="inline-flex items-center gap-1"><HugeiconsIcon icon={ViewIcon} className="h-3 w-3" />{post.viewsCount.toLocaleString()}</span>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">{icon}</span>
      <h3 className="mt-4 font-heading text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <Link href={action.href} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">{action.label}</Link>}
    </div>
  );
}