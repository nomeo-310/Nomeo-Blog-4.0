// app/api/admin/creators/[creatorId]/export/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { User }                        from "@/models/user";
import { Profile }                     from "@/models/profile";
import { CreatorEarning }              from "@/models/creator-earning";
import { AccountSummaryDocument }      from "@/lib/pdf/account-summary-document";
import { renderPdfResponse }           from "@/lib/pdf/render";

export const dynamic = "force-dynamic";

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

    const [user, profile, recentEarnings] = await Promise.all([
      User.findById(creatorId).lean(),
      Profile.findOne({ userId: creatorId }).lean(),
      CreatorEarning.find({ creatorId }).sort({ billingPeriod: -1 }).limit(6).lean(),
    ]);
    if (!user || user.role !== "creator") {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    await logAdminAction(req, admin, {
      action: AdminAction.EXPORT_DATA,
      details: `exported PDF account summary for creator "${user.name}"`,
      targetType: "user",
      targetId: String(user._id),
      targetName: user.name,
      reversible: true,
    });

    return renderPdfResponse(
      AccountSummaryDocument({
        account: { id: String(user._id), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
        profile: profile ? {
          username: profile.username,
          displayName: profile.displayName,
          banStatus: profile.banStatus,
          followersCount: profile.followersCount,
          followingCount: profile.followingCount,
          postsCount: profile.postsCount,
        } : null,
        subscription: null,
        creator: {
          creatorStatus: profile?.creatorStatus ?? null,
          becameCreatorAt: profile?.becameCreatorAt ?? null,
          recentEarnings: recentEarnings.map((e) => ({
            billingPeriod: e.billingPeriod, netAmount: e.netAmount, currency: e.currency, payoutStatus: e.payoutStatus,
          })),
        },
      }),
      `creator-summary-${String(user._id)}.pdf`
    );
  } catch (error) {
    console.error("[admin/creators/:creatorId/export] failed to generate export:", error);
    return NextResponse.json({ error: "Failed to generate creator summary" }, { status: 500 });
  }
}
