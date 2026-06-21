// app/api/lounges/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/connect-to-database";
import { Lounge } from "@/models/lounge";
import { Profile } from "@/models/profile";
import { LoungeJoinRequest } from "@/models/lounge-join-request";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/lounges?q=&page=1&limit=12
 * -----------------------------------
 * Lists active lounges for discovery with server-side SEARCH + PAGINATION.
 *
 * BOTH sections appear on every page: platform (open) and creator (members-only)
 * are paginated INDEPENDENTLY but in lockstep — page N returns the Nth slice of
 * each section. So you always see both kinds (when both have results on that
 * page), and paging continues until the LONGER section is exhausted.
 *
 *   q      — optional text search over name + description (case-insensitive)
 *   page   — 1-based page number (default 1)
 *   limit  — page size PER SECTION (default 12, capped at 48)
 *
 * Returns:
 *   {
 *     platform: { items, totalItems, totalPages },
 *     creator:  { items, totalItems, totalPages },
 *     page, totalPages, isAuthenticated
 *   }
 */
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    const params = new URL(req.url).searchParams;
    const q = (params.get("q") ?? "").trim();
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const base: Record<string, unknown> = { status: "active", isSuspended: { $ne: true } };
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      base.$or = [{ name: rx }, { description: rx }];
    }

    const platformFilter = { ...base, kind: "platform" };
    const creatorFilter = { ...base, kind: "creator" };

    // Counts + this page's slice for each section, all in parallel.
    const [platformTotal, creatorTotal, platformDocs, creatorDocs] = await Promise.all([
      Lounge.countDocuments(platformFilter),
      Lounge.countDocuments(creatorFilter),
      Lounge.find(platformFilter).sort({ membersCount: -1 }).skip(skip).limit(limit).lean(),
      Lounge.find(creatorFilter).sort({ membersCount: -1 }).skip(skip).limit(limit).lean(),
    ]);

    // Join creator profiles for the creator slice (one batched query).
    const creatorIds = creatorDocs.filter((l: any) => l.creatorId).map((l: any) => l.creatorId);
    const profiles = creatorIds.length
      ? await Profile.find({ userId: { $in: creatorIds } })
          .select("userId displayName username profileImage")
          .lean()
      : [];
    const profileByUser = new Map(profiles.map((p: any) => [String(p.userId), p]));

    // For a signed-in viewer, look up their join-request status for the creator
    // lounges on this page, so each card can show Request / Pending / Member.
    const requestStatusByLounge = new Map<string, string>();
    if (user && creatorDocs.length) {
      const loungeIds = creatorDocs.map((l: any) => l._id);
      const requests = await LoungeJoinRequest.find({
        loungeId: { $in: loungeIds },
        requesterId: user.id,
        status: { $in: ["pending", "approved"] },
      })
        .select("loungeId status")
        .lean();
      for (const r of requests as any[]) {
        requestStatusByLounge.set(String(r.loungeId), r.status);
      }
    }

    const shape = (l: any) => {
      const creatorProfile = l.creatorId ? profileByUser.get(String(l.creatorId)) : null;
      // Request status only applies to creator lounges; platform are always "open".
      const joinStatus =
        l.kind === "creator"
          ? (requestStatusByLounge.get(String(l._id)) ?? "none") // none | pending | approved
          : "open";
      // Creator always owns their lounge — skip join flow entirely.
      const isOwner = !!user && !!l.creatorId && String(l.creatorId) === user.id;
      return {
        id: String(l._id),
        kind: l.kind,
        accessType: l.accessType,
        name: l.name,
        description: l.description ?? "",
        coverImage: l.coverImage ?? null,
        rules: l.rules ?? [],
        membersCount: l.membersCount ?? 0,
        messagesCount: l.messagesCount ?? 0,
        isMuted: !!l.isMuted,
        joinStatus,
        isOwner,
        creator: creatorProfile
          ? {
              id: String(creatorProfile.userId),
              displayName: creatorProfile.displayName,
              username: creatorProfile.username,
              avatar: creatorProfile.profileImage?.url ?? null,
            }
          : null,
        canBrowse: true,
      };
    };

    const platformPages = Math.max(1, Math.ceil(platformTotal / limit));
    const creatorPages = Math.max(1, Math.ceil(creatorTotal / limit));

    return NextResponse.json({
      platform: {
        items: platformDocs.map(shape),
        totalItems: platformTotal,
        totalPages: platformPages,
      },
      creator: {
        items: creatorDocs.map(shape),
        totalItems: creatorTotal,
        totalPages: creatorPages,
      },
      page,
      // Page until the LONGER section runs out.
      totalPages: Math.max(platformPages, creatorPages),
      isAuthenticated: !!user,
    });
  } catch (error) {
    console.error("[GET /api/lounges]", error);
    return NextResponse.json({ error: "Failed to load lounges" }, { status: 500 });
  }
}