// app/api/admin/creators/[creatorId]/earnings/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { User }                        from "@/models/user";
import { CreatorEarning, type PayoutStatus } from "@/models/creator-earning";

export const dynamic = "force-dynamic";

const PAYOUT_STATUSES: PayoutStatus[] = ["pending", "calculated", "processing", "paid", "failed", "on_hold"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  if (!mongoose.Types.ObjectId.isValid(creatorId)) {
    return NextResponse.json({ error: "Invalid creator id" }, { status: 400 });
  }

  try {
    await connectDB();

    const user = await User.findById(creatorId).lean();
    if (!user || user.role !== "creator") {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const params2 = new URL(req.url).searchParams;
    const statusParam  = params2.get("payoutStatus") ?? "all";
    const payoutStatus = PAYOUT_STATUSES.includes(statusParam as PayoutStatus) ? statusParam : "all";
    const page  = Math.max(1, Number(params2.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(params2.get("limit")) || 20));

    const match: Record<string, unknown> = { creatorId: new mongoose.Types.ObjectId(creatorId) };
    if (payoutStatus !== "all") match.payoutStatus = payoutStatus;

    const [earnings, total] = await Promise.all([
      CreatorEarning.find(match)
        .sort({ billingPeriod: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CreatorEarning.countDocuments(match),
    ]);

    return NextResponse.json({
      creatorId,
      filters: { payoutStatus },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      earnings: earnings.map((e) => ({
        id: String(e._id),
        billingPeriod: e.billingPeriod,
        weightedReadMinutes: e.weightedReadMinutes,
        readMinutesShare: e.readMinutesShare,
        grossAmount: e.grossAmount,
        platformCutAmount: e.platformCutAmount,
        netAmount: e.netAmount,
        currency: e.currency,
        payoutStatus: e.payoutStatus,
        topPosts: e.topPosts,
        payoutTransferId: e.payoutTransferId,
        payoutInitiatedAt: e.payoutInitiatedAt,
        payoutCompletedAt: e.payoutCompletedAt,
        payoutFailureReason: e.payoutFailureReason,
        adminNotes: e.adminNotes,
      })),
    });
  } catch (error) {
    console.error("[admin/creators/:creatorId/earnings] failed to load earnings:", error);
    return NextResponse.json({ error: "Failed to load earnings" }, { status: 500 });
  }
}
