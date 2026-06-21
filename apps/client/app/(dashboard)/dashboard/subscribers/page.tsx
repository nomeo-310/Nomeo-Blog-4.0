import mongoose from "mongoose";
import { Users } from "lucide-react";
import Link from "next/link";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Subscribers',
}



/** Route: app/dashboard/subscribers/page.tsx — creator only */
export default async function SubscribersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");
  const { followers, total } = await getFollowers(user.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Subscribers</h2>
          <p className="mt-1 text-sm text-muted-foreground">{total.toLocaleString()} {total === 1 ? "follower" : "followers"}</p>
        </div>

        {followers.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30" />
            <h3 className="mt-4 font-heading text-base font-bold text-foreground">No followers yet</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">Keep publishing great writing — your audience will follow.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
            {followers.map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-5 py-4">
                <Link href={`/profile/${f.username}`} className="shrink-0">
                  {f.avatar
                    ? <img src={f.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{f.name.charAt(0).toUpperCase()}</span>}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${f.username}`} className="block truncate text-sm font-semibold text-foreground hover:text-primary">{f.name}</Link>
                  <p className="truncate text-xs text-muted-foreground">@{f.username} · followed {formatDate(f.since)}</p>
                </div>
              </div>
            ))}
            {total > followers.length && (
              <div className="px-5 py-3 text-center text-xs text-muted-foreground">
                Showing {followers.length} of {total.toLocaleString()} followers
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

async function getFollowers(userId: string) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return { followers: [], total: 0 };
    const uid = new mongoose.Types.ObjectId(userId);
    const [total, raw] = await Promise.all([
      db.collection("followings").countDocuments({ followingId: uid, isActive: true }),
      db.collection("followings").find({ followingId: uid, isActive: true })
        .project({ followerId: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(50).toArray(),
    ]);
    if (!raw.length) return { followers: [], total };
    const followerIds = raw.map((r: any) => r.followerId);
    const profiles = await db.collection("profiles")
      .find({ userId: { $in: followerIds } }, { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1 } })
      .toArray();
    const pm = new Map(profiles.map((p: any) => [String(p.userId), p]));
    const followers = raw.map((r: any) => {
      const p = pm.get(String(r.followerId));
      return {
        id: String(r._id), name: String(p?.displayName || "User"), username: String(p?.username || ""),
        avatar: String(p?.profileImage?.url || ""),
        since: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date().toISOString(),
      };
    });
    return { followers, total };
  } catch { return { followers: [], total: 0 }; }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(iso));
}