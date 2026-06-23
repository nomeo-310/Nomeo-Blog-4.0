import mongoose from "mongoose";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/features/dashboard-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Subscribers',
}

/**
 * /dashboard/subscribers — creator only.
 *
 * Shows accepted members across all the creator's lounges.
 * Followers are already covered in /dashboard/connections — no duplication.
 *
 * Route: app/dashboard/subscribers/page.tsx
 */
export default async function SubscribersPage() {
  
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  const { loungeMembers, loungeTotal, lounges } = await getLoungeMembers(user.id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Audience</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Members accepted into your lounge{lounges.length !== 1 ? "s" : ""} — your closest community.
          </p>
        </div>

        {/* Summary */}
        {loungeTotal > 0 && (
          <p className="text-sm text-muted-foreground">
            {loungeTotal.toLocaleString()} {loungeTotal === 1 ? "member" : "members"}
            {lounges.length > 1 && ` across ${lounges.length} lounges`}
          </p>
        )}

        {/* Empty states */}
        {lounges.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <h3 className="mt-4 font-heading text-base font-bold text-foreground">No lounge yet</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Create a lounge to build a private community around your writing.
            </p>
            <Link href="/dashboard/lounges/new"
              className="mt-5 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Create a lounge
            </Link>
          </div>
        ) : loungeMembers.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <h3 className="mt-4 font-heading text-base font-bold text-foreground">No members yet</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Members will appear here once they join and are approved into your lounge.
            </p>
          </div>
        ) : (
          /* ── Member grid — same stacked avatar card style as connections ── */
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {loungeMembers.map((m) => (
              <div key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
                <Link href={`/profile/${m.username}`} className="shrink-0">
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/profile/${m.username}`}
                      className="truncate text-sm font-semibold text-foreground hover:text-primary">
                      {m.name}
                    </Link>
                    {m.role === "moderator" && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        Mod
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
                  {/* Show lounge name only if creator has multiple lounges */}
                  {lounges.length > 1 && m.loungeName && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      <MessageSquare className="mr-0.5 inline h-3 w-3" />
                      {m.loungeName}
                    </p>
                  )}
                </div>
                {m.joinedAt && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDate(m.joinedAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {loungeTotal > loungeMembers.length && (
          <p className="text-center text-xs text-muted-foreground">
            Showing {loungeMembers.length} of {loungeTotal.toLocaleString()} members
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── Data ────────────────────────────────────────────────────────────────── */

async function getLoungeMembers(creatorId: string) {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return { loungeMembers: [], loungeTotal: 0, lounges: [] };

    const uid = new mongoose.Types.ObjectId(creatorId);

    const lounges = await db.collection("lounges")
      .find({ creatorId: uid, status: "active" }, { projection: { _id: 1, name: 1 } })
      .toArray();

    if (!lounges.length) return { loungeMembers: [], loungeTotal: 0, lounges: [] };

    const loungeIds = lounges.map((l: any) => l._id);
    const loungeMap = new Map(lounges.map((l: any) => [String(l._id), String(l.name)]));

    const [loungeTotal, memberDocs] = await Promise.all([
      db.collection("lounge_members").countDocuments({
        loungeId: { $in: loungeIds },
        status:   "accepted",
        userId:   { $ne: uid },
      }),
      db.collection("lounge_members")
        .find(
          { loungeId: { $in: loungeIds }, status: "accepted", userId: { $ne: uid } },
          { projection: { userId: 1, loungeId: 1, role: 1, respondedAt: 1 } }
        )
        .sort({ respondedAt: -1 })
        .limit(50)
        .toArray(),
    ]);

    if (!memberDocs.length) return { loungeMembers: [], loungeTotal, lounges };

    const memberUserIds = memberDocs.map((m: any) => m.userId);
    const profiles = await db.collection("profiles")
      .find(
        { userId: { $in: memberUserIds } },
        { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1 } }
      )
      .toArray();
    const profileMap = new Map(profiles.map((p: any) => [String(p.userId), p]));

    const loungeMembers = memberDocs.map((m: any) => {
      const p = profileMap.get(String(m.userId));
      return {
        id:         String(m._id),
        name:       String(p?.displayName || "Member"),
        username:   String(p?.username    || ""),
        avatar:     String(p?.profileImage?.url || ""),
        loungeName: loungeMap.get(String(m.loungeId)) ?? null,
        role:       String(m.role || "member"),
        joinedAt:   m.respondedAt instanceof Date ? m.respondedAt.toISOString() : null,
      };
    });

    return { loungeMembers, loungeTotal, lounges };
  } catch (err) {
    console.error("[SubscribersPage] getLoungeMembers failed", err);
    return { loungeMembers: [], loungeTotal: 0, lounges: [] };
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(iso));
}