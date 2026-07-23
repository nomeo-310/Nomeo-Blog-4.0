// app/api/admin/users/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest:         { createdAt: -1 },
  oldest:         { createdAt: 1 },
  most_followers: { "profile.followersCount": -1 },
  most_posts:     { "profile.postsCount": -1 },
};

const ROLES = ["user", "creator"] as const;
const BAN_STATUSES = ["active", "banned", "shadow_banned"] as const;

interface UserListRow {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  avatar?: string;
  createdAt: Date;
  profile?: {
    username: string;
    displayName: string;
    profileImage?: { url: string } | null;
    banStatus: string;
    banExpiresAt?: Date;
    creatorStatus?: string | null;
    followersCount: number;
    postsCount: number;
    freeReadsRemaining: number;
  };
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const roleParam    = params.get("role") ?? "all";
    const role         = ROLES.includes(roleParam as (typeof ROLES)[number]) ? roleParam : "all";
    const banParam     = params.get("banStatus") ?? "all";
    const banStatus    = BAN_STATUSES.includes(banParam as (typeof BAN_STATUSES)[number]) ? banParam : "all";
    const search       = params.get("search")?.trim();
    const sortByParam  = params.get("sortBy") ?? "newest";
    const sortBy       = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page         = Math.max(1, Number(params.get("page")) || 1);
    const limit        = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const userMatch: Record<string, unknown> = role === "all" ? { role: { $in: ROLES } } : { role };

    const searchMatch = search
      ? {
          $or: [
            { name:  { $regex: escapeRegExp(search), $options: "i" } },
            { email: { $regex: escapeRegExp(search), $options: "i" } },
            { "profile.username": { $regex: escapeRegExp(search), $options: "i" } },
          ],
        }
      : null;

    const [facetResult] = await db
      .collection("user")
      .aggregate([
        { $match: userMatch },
        {
          $lookup: {
            from: "profiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        ...(banStatus !== "all" ? [{ $match: { "profile.banStatus": banStatus } }] : []),
        ...(searchMatch ? [{ $match: searchMatch }] : []),
        {
          $facet: {
            data: [
              { $sort: { ...SORT_STAGES[sortBy], _id: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  name: 1, email: 1, emailVerified: 1, role: 1, avatar: 1, createdAt: 1,
                  "profile.username": 1, "profile.displayName": 1, "profile.profileImage": 1,
                  "profile.banStatus": 1, "profile.banExpiresAt": 1, "profile.creatorStatus": 1,
                  "profile.followersCount": 1, "profile.postsCount": 1, "profile.freeReadsRemaining": 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as UserListRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const users = rows.map((r) => ({
      id:            String(r._id),
      name:          r.name,
      email:         r.email,
      emailVerified: r.emailVerified,
      role:          r.role,
      avatar:        r.avatar || r.profile?.profileImage?.url || "",
      username:      r.profile?.username ?? null,
      displayName:   r.profile?.displayName ?? r.name,
      banStatus:     r.profile?.banStatus ?? "active",
      banExpiresAt:  r.profile?.banExpiresAt ?? null,
      creatorStatus: r.profile?.creatorStatus ?? null,
      followersCount: r.profile?.followersCount ?? 0,
      postsCount:     r.profile?.postsCount ?? 0,
      freeReadsRemaining: r.profile?.freeReadsRemaining ?? 0,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      filters: { role, banStatus, search },
      sortBy,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      users,
    });
  } catch (error) {
    console.error("[admin/users] failed to list users:", error);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
