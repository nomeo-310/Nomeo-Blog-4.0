import Link from "next/link";
import mongoose from "mongoose";
import { MessageSquare, Plus, Users, Lock, Check, X } from "lucide-react";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Lounges',
}

/** Route: app/dashboard/lounges/page.tsx — creator only */
export default async function DashboardLoungesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  const [lounges, requests] = await Promise.all([
    getMyLounges(user.id),
    getJoinRequests(user.id),
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-10">
        {/* My lounges */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Lounges</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your members-only conversation rooms.</p>
            </div>
            { lounges && lounges.length < 1 &&
              <Link
                href="/dashboard/lounges/new"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Create lounge
              </Link>
            }
          </div>

          {lounges.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              <h3 className="mt-4 font-heading text-base font-bold text-foreground">No lounges yet</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">Create a members-only lounge and invite your audience to join the conversation.</p>
              <Link href="/dashboard/lounges/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Create your first lounge
              </Link>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {lounges.map((l) => (
                <div key={l.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Lock className="h-4.5 w-4.5" />
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                      l.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"
                    )}>
                      {l.status}
                    </span>
                  </div>
                  <h3 className="mt-3 font-heading text-base font-bold text-foreground">{l.name}</h3>
                  {l.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{l.description}</p>}
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{l.membersCount} members</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{l.messagesCount} messages</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/lounges/${l.id}`} className="flex-1 rounded-lg border border-border py-1.5 text-center text-xs font-medium text-foreground hover:bg-accent">View</Link>
                    <Link href={`/dashboard/lounges/${l.id}/edit`} className="flex-1 rounded-lg border border-border py-1.5 text-center text-xs font-medium text-foreground hover:bg-accent">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Join requests */}
        {requests.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Join requests
              <span className="ml-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{requests.length}</span>
            </h3>
            <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                  {r.requesterAvatar
                    ? <img src={r.requesterAvatar} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                    : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{r.requesterName.charAt(0).toUpperCase()}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{r.requesterName}</p>
                    <p className="text-xs text-muted-foreground">@{r.requesterUsername} · wants to join <span className="font-medium">{r.loungeName}</span></p>
                    {r.message && <p className="mt-1 text-xs italic text-muted-foreground">"{r.message}"</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={`/api/lounges/${r.loungeId}/join-requests/${r.id}`} method="PATCH">
                      <button type="submit" name="action" value="approve"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90" title="Approve">
                        <Check className="h-4 w-4" />
                      </button>
                    </form>
                    <form action={`/api/lounges/${r.loungeId}/join-requests/${r.id}`} method="PATCH">
                      <button type="submit" name="action" value="decline"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive" title="Decline">
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Approving a request grants the user access to the lounge.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

async function getMyLounges(userId: string) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return [];
    const raw = await db.collection("lounges")
      .find({ creatorId: new mongoose.Types.ObjectId(userId), kind: "creator" })
      .project({ name: 1, description: 1, status: 1, membersCount: 1, messagesCount: 1 })
      .sort({ createdAt: -1 }).toArray();
    return raw.map((l: any) => ({
      id: String(l._id), name: String(l.name || ""), description: String(l.description || ""),
      status: String(l.status || "active"), membersCount: Number(l.membersCount || 0), messagesCount: Number(l.messagesCount || 0),
    }));
  } catch { return []; }
}

async function getJoinRequests(userId: string) {
  try {
    const db = mongoose.connection.db;
    if (!db) return [];
    const uid = new mongoose.Types.ObjectId(userId);
    const requests = await db.collection("lounge_join_requests")
      .find({ creatorId: uid, status: "pending" })
      .sort({ createdAt: -1 }).limit(20).toArray();
    if (!requests.length) return [];

    const loungeIds = requests.map((r: any) => r.loungeId);
    const requesterIds = requests.map((r: any) => r.requesterId);

    const [lounges, profiles] = await Promise.all([
      db.collection("lounges").find({ _id: { $in: loungeIds } }, { projection: { name: 1 } }).toArray(),
      db.collection("profiles").find({ userId: { $in: requesterIds } }, { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1 } }).toArray(),
    ]);

    const loungeMap = new Map(lounges.map((l: any) => [String(l._id), l]));
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    return requests.map((r: any) => {
      const profile = profileMap.get(String(r.requesterId));
      const lounge = loungeMap.get(String(r.loungeId));
      return {
        id: String(r._id), loungeId: String(r.loungeId),
        loungeName: String(lounge?.name || "Lounge"),
        requesterName: String(profile?.displayName || "User"),
        requesterUsername: String(profile?.username || ""),
        requesterAvatar: String(profile?.profileImage?.url || ""),
        message: r.message ? String(r.message) : null,
      };
    });
  } catch { return []; }
}