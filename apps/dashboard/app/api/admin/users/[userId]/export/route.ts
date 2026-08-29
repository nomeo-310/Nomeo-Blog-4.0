// app/api/admin/users/[userId]/export/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { User }                        from "@/models/user";
import { Profile }                     from "@/models/profile";
import { Subscription }                from "@/models/subscription";
import { AccountSummaryDocument }      from "@/lib/pdf/account-summary-document";
import { renderPdfResponse }           from "@/lib/pdf/render";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  try {
    await connectDB();

    const [user, profile, subscription] = await Promise.all([
      User.findById(userId).lean(),
      Profile.findOne({ userId }).lean(),
      Subscription.findOne({ subscriberId: userId, status: { $in: ["active", "trialing", "past_due", "paused"] } }).lean(),
    ]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await logAdminAction(req, admin, {
      action: AdminAction.EXPORT_DATA,
      details: `exported PDF account summary for user "${user.name}"`,
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
        subscription: subscription ? {
          status: subscription.status, interval: subscription.interval, currentPeriodEnd: subscription.currentPeriodEnd,
        } : null,
      }),
      `account-summary-${String(user._id)}.pdf`
    );
  } catch (error) {
    console.error("[admin/users/:userId/export] failed to generate export:", error);
    return NextResponse.json({ error: "Failed to generate account summary" }, { status: 500 });
  }
}
