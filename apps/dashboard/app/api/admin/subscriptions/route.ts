// app/api/admin/subscriptions/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest:        { createdAt: -1 },
  oldest:        { createdAt: 1 },
  ending_soon:   { currentPeriodEnd: 1 },
};

const STATUSES = ["active", "past_due", "cancelled", "expired", "trialing", "paused"] as const;

interface SubscriptionListRow {
  _id: mongoose.Types.ObjectId;
  subscriberId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: string;
  interval: string;
  priceAmount: number;
  currency: string;
  currentPeriodEnd: Date;
  autoRenew: boolean;
  createdAt: Date;
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const statusParam = params.get("status") ?? "all";
    const status      = (STATUSES as readonly string[]).includes(statusParam) ? statusParam : "all";
    const search      = params.get("search")?.trim();
    const sortByParam = params.get("sortBy") ?? "newest";
    const sortBy      = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page        = Math.max(1, Number(params.get("page")) || 1);
    const limit       = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (status !== "all") match.status = status;

    const [facetResult] = await db
      .collection("subscriptions")
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "user",
            localField: "subscriberId",
            foreignField: "_id",
            as: "subscriber",
          },
        },
        { $unwind: { path: "$subscriber", preserveNullAndEmptyArrays: true } },
        ...(search
          ? [{
              $match: {
                $or: [
                  { "subscriber.name": { $regex: escapeRegExp(search), $options: "i" } },
                  { "subscriber.email": { $regex: escapeRegExp(search), $options: "i" } },
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
                  subscriberId: 1, planId: 1, status: 1, interval: 1, priceAmount: 1,
                  currency: 1, currentPeriodEnd: 1, autoRenew: 1, createdAt: 1,
                  "subscriber.name": 1, "subscriber.email": 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as (SubscriptionListRow & { subscriber?: { name: string; email: string } })[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const planIds = [...new Set(rows.map((r) => String(r.planId)))].map((id) => new mongoose.Types.ObjectId(id));
    const plans = planIds.length
      ? await db.collection("plans").find({ _id: { $in: planIds } }, { projection: { name: 1 } }).toArray()
      : [];
    const planNameById = new Map(plans.map((p) => [String(p._id), p.name as string]));

    const subscriptions = rows.map((r) => ({
      id: String(r._id),
      subscriber: { id: String(r.subscriberId), name: r.subscriber?.name ?? "Unknown", email: r.subscriber?.email ?? "" },
      planName: planNameById.get(String(r.planId)) ?? "Unknown plan",
      status: r.status,
      interval: r.interval,
      priceAmount: r.priceAmount,
      currency: r.currency,
      currentPeriodEnd: r.currentPeriodEnd,
      autoRenew: r.autoRenew,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      filters: { status, search },
      sortBy,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      subscriptions,
    });
  } catch (error) {
    console.error("[admin/subscriptions] failed to list subscriptions:", error);
    return NextResponse.json({ error: "Failed to load subscriptions" }, { status: 500 });
  }
}
