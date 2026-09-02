import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { CreatorEarning } from "@/models/creator-earning";
import { Profile } from "@/models/profile";
import { getPlatformSettings } from "@/models/platform-settings";

export const dynamic = "force-dynamic";

/**
 * POST /api/creator/earnings/[earningId]/request-payout
 * ---------------------------------------------------------
 * The creator's side of "apply for payout": marks a calculated earning as
 * requested so an admin can honor it (see the admin dashboard's mark_paid
 * action, which is gated on this being set). Payouts never go out
 * automatically — the creator has to ask for them, and only once verified
 * payout details are on file and the amount clears the admin-configured
 * minimum.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ earningId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.isCreator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { earningId } = await params;
  if (!mongoose.Types.ObjectId.isValid(earningId)) {
    return NextResponse.json({ error: "Invalid earning id" }, { status: 400 });
  }

  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await rateLimit({ key: "request-payout:" + ip, limit: 5, windowSeconds: 900 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    await connectDB();

    const earning = await CreatorEarning.findOne({ _id: earningId, creatorId: user.id });
    if (!earning) return NextResponse.json({ error: "Earning record not found" }, { status: 404 });

    if (earning.payoutRequestedAt) {
      return NextResponse.json({ error: "Payout already requested for this period" }, { status: 400 });
    }
    if (earning.payoutStatus !== "calculated") {
      return NextResponse.json({ error: "This earning isn't ready to be requested yet" }, { status: 400 });
    }

    const [profile, settings] = await Promise.all([
      Profile.findOne({ userId: new mongoose.Types.ObjectId(user.id) }, { payoutDetails: 1 }).lean(),
      getPlatformSettings(),
    ]);

    if (!profile?.payoutDetails?.recipientCode) {
      return NextResponse.json({ error: "Add and verify your payout bank details in Settings first" }, { status: 400 });
    }

    if (earning.netAmount < settings.minimumPayoutAmount) {
      const shortfall = ((settings.minimumPayoutAmount - earning.netAmount) / 100).toLocaleString("en-NG", { style: "currency", currency: settings.currency });
      return NextResponse.json({
        error: `Your balance is below the ${settings.currency} ${(settings.minimumPayoutAmount / 100).toLocaleString()} minimum payout — ${shortfall} more needed. It'll roll forward into next period.`,
      }, { status: 400 });
    }

    earning.payoutRequestedAt = new Date();
    await earning.save();

    return NextResponse.json({ id: String(earning._id), payoutRequestedAt: earning.payoutRequestedAt });
  } catch (err) {
    console.error("[POST /api/creator/earnings/:earningId/request-payout]", err);
    return NextResponse.json({ error: "Failed to request payout" }, { status: 500 });
  }
}
