// app/api/admin/creators/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest:         { becameCreatorAt: -1 },
  oldest:         { becameCreatorAt: 1 },
  most_followers: { "profile.followersCount": -1 },
  most_posts:     { "profile.postsCount": -1 },
};

const CREATOR_STATUSES = ["active", "suspended"] as const;

interface CreatorListRow {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  createdAt: Date;
  profile?: {
    username: string;
    displayName: string;
    profileImage?: { url: string } | null;
    banStatus: string;
    creatorStatus?: string | null;
    creatorSuspensionReason?: string;
    becameCreatorAt?: Date | null;
    followersCount: number;
    postsCount: number;
    creatorTopics: string[];
  };
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const statusParam    = params.get("creatorStatus") ?? "all";
    const creatorStatus  = CREATOR_STATUSES.includes(statusParam as (typeof CREATOR_STATUSES)[number]) ? statusParam : "all";
    const search         = params.get("search")?.trim();
    const sortByParam    = params.get("sortBy") ?? "newest";
    const sortBy         = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page           = Math.max(1, Number(params.get("page")) || 1);
    const limit          = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

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
        { $match: { role: "creator" } },
        {
          $lookup: {
            from: "profiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        ...(creatorStatus !== "all" ? [{ $match: { "profile.creatorStatus": creatorStatus } }] : []),
        ...(searchMatch ? [{ $match: searchMatch }] : []),
        {
          $facet: {
            data: [
              { $sort: { ...SORT_STAGES[sortBy], _id: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  name: 1, email: 1, createdAt: 1,
                  "profile.username": 1, "profile.displayName": 1, "profile.profileImage": 1,
                  "profile.banStatus": 1, "profile.creatorStatus": 1, "profile.creatorSuspensionReason": 1,
                  "profile.becameCreatorAt": 1, "profile.followersCount": 1, "profile.postsCount": 1,
                  "profile.creatorTopics": 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as CreatorListRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const creators = rows.map((r) => ({
      id:            String(r._id),
      name:          r.name,
      email:         r.email,
      username:      r.profile?.username ?? null,
      displayName:   r.profile?.displayName ?? r.name,
      avatar:        r.profile?.profileImage?.url ?? "",
      banStatus:     r.profile?.banStatus ?? "active",
      creatorStatus: r.profile?.creatorStatus ?? null,
      creatorSuspensionReason: r.profile?.creatorSuspensionReason ?? null,
      becameCreatorAt: r.profile?.becameCreatorAt ?? null,
      followersCount:  r.profile?.followersCount ?? 0,
      postsCount:      r.profile?.postsCount ?? 0,
      creatorTopics:   r.profile?.creatorTopics ?? [],
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      filters: { creatorStatus, search },
      sortBy,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      creators,
    });
  } catch (error) {
    console.error("[admin/creators] failed to list creators:", error);
    return NextResponse.json({ error: "Failed to load creators" }, { status: 500 });
  }
}
