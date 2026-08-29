// app/api/admin/followers/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
};

interface FollowingListRow {
  _id: mongoose.Types.ObjectId;
  followerId: mongoose.Types.ObjectId;
  followingId: mongoose.Types.ObjectId;
  isActive: boolean;
  notifyOnNewPost: boolean;
  createdAt: Date;
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const statusParam = params.get("status") ?? "active";
    const isActiveFilter = statusParam === "all" ? null : statusParam === "active";
    const search      = params.get("search")?.trim();
    const sortByParam = params.get("sortBy") ?? "newest";
    const sortBy      = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page        = Math.max(1, Number(params.get("page")) || 1);
    const limit       = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (isActiveFilter !== null) match.isActive = isActiveFilter;

    const [facetResult] = await db
      .collection("followings")
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "user", localField: "followerId", foreignField: "_id", as: "follower",
          },
        },
        { $unwind: { path: "$follower", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "user", localField: "followingId", foreignField: "_id", as: "followed",
          },
        },
        { $unwind: { path: "$followed", preserveNullAndEmptyArrays: true } },
        ...(search
          ? [{
              $match: {
                $or: [
                  { "follower.name": { $regex: escapeRegExp(search), $options: "i" } },
                  { "follower.email": { $regex: escapeRegExp(search), $options: "i" } },
                  { "followed.name": { $regex: escapeRegExp(search), $options: "i" } },
                  { "followed.email": { $regex: escapeRegExp(search), $options: "i" } },
                ],
              },
            }]
          : []),
        {
          $facet: {
            data: [
              { $sort: { ...SORT_STAGES[sortBy], _id: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  followerId: 1, followingId: 1, isActive: 1, notifyOnNewPost: 1, createdAt: 1,
                  "follower.name": 1, "follower.email": 1,
                  "followed.name": 1, "followed.email": 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as (FollowingListRow & {
      follower?: { name: string; email: string };
      followed?: { name: string; email: string };
    })[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const followers = rows.map((r) => ({
      id: String(r._id),
      follower: { id: String(r.followerId), name: r.follower?.name ?? "Unknown", email: r.follower?.email ?? "" },
      following: { id: String(r.followingId), name: r.followed?.name ?? "Unknown", email: r.followed?.email ?? "" },
      isActive: r.isActive,
      notifyOnNewPost: r.notifyOnNewPost,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      filters: { status: statusParam, search },
      sortBy,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      followers,
    });
  } catch (error) {
    console.error("[admin/followers] failed to list followers:", error);
    return NextResponse.json({ error: "Failed to load followers" }, { status: 500 });
  }
}
