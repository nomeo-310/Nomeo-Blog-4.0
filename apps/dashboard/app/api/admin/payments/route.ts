// app/api/admin/payments/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { PaymentGatewayStatus }        from "@/models/payment";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest:      { createdAt: -1 },
  oldest:      { createdAt: 1 },
  amount_high: { amount: -1 },
  amount_low:  { amount: 1 },
};

const STATUSES = Object.values(PaymentGatewayStatus);

interface PaymentListRow {
  _id: mongoose.Types.ObjectId;
  reference: string;
  amount: number;
  amountPaid: number;
  currency: string;
  gatewayStatus: string;
  channel?: string;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  paidAt?: Date;
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
    const status      = (STATUSES as string[]).includes(statusParam) ? statusParam : "all";
    const search      = params.get("search")?.trim();
    const dateFrom     = params.get("dateFrom");
    const dateTo       = params.get("dateTo");
    const sortByParam = params.get("sortBy") ?? "newest";
    const sortBy      = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page        = Math.max(1, Number(params.get("page")) || 1);
    const limit       = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (status !== "all") match.gatewayStatus = status;
    if (dateFrom || dateTo) {
      match.createdAt = {
        ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { $lte: new Date(dateTo) } : {}),
      };
    }

    const [facetResult] = await db
      .collection("payments")
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "user",
            localField: "userId",
            foreignField: "_id",
            as: "payer",
          },
        },
        { $unwind: { path: "$payer", preserveNullAndEmptyArrays: true } },
        ...(search
          ? [{
              $match: {
                $or: [
                  { reference: { $regex: escapeRegExp(search), $options: "i" } },
                  { "payer.name": { $regex: escapeRegExp(search), $options: "i" } },
                  { "payer.email": { $regex: escapeRegExp(search), $options: "i" } },
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
                  reference: 1, amount: 1, amountPaid: 1, currency: 1, gatewayStatus: 1,
                  channel: 1, userId: 1, planId: 1, paidAt: 1, createdAt: 1,
                  "payer.name": 1, "payer.email": 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
            stats: [
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: { $cond: [{ $eq: ["$gatewayStatus", "success"] }, "$amountPaid", 0] } },
                  successCount: { $sum: { $cond: [{ $eq: ["$gatewayStatus", "success"] }, 1, 0] } },
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as (PaymentListRow & { payer?: { name: string; email: string } })[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;
    const totalAmount = facetResult?.stats?.[0]?.totalAmount ?? 0;
    const successCount = facetResult?.stats?.[0]?.successCount ?? 0;

    const planIds = [...new Set(rows.map((r) => String(r.planId)))].map((id) => new mongoose.Types.ObjectId(id));
    const plans = planIds.length
      ? await db.collection("plans").find({ _id: { $in: planIds } }, { projection: { name: 1 } }).toArray()
      : [];
    const planNameById = new Map(plans.map((p) => [String(p._id), p.name as string]));

    const payments = rows.map((r) => ({
      id:        String(r._id),
      reference: r.reference,
      amount:    r.amount,
      amountPaid: r.amountPaid,
      currency:  r.currency,
      gatewayStatus: r.gatewayStatus,
      channel:   r.channel ?? null,
      payer:     { id: String(r.userId), name: r.payer?.name ?? "Unknown", email: r.payer?.email ?? "" },
      planName:  planNameById.get(String(r.planId)) ?? "Unknown plan",
      paidAt:    r.paidAt ?? null,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      filters: { status, search, dateFrom, dateTo },
      sortBy,
      summary: { totalAmount, successCount },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      payments,
    });
  } catch (error) {
    console.error("[admin/payments] failed to list payments:", error);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
}
