// app/api/admin/followers/[followingId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Following }                   from "@/models/following";

export const dynamic = "force-dynamic";

/**
 * Force-removes a follow relationship — e.g. a harassment/abuse case where
 * the followed user wants the connection severed but can't get the follower
 * to unfollow. No dedicated permission flag exists; low-stakes and reversible
 * (the follower can simply follow again), so baseline admin access is enough.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ followingId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { followingId } = await params;
  if (!mongoose.Types.ObjectId.isValid(followingId)) {
    return NextResponse.json({ error: "Invalid follow id" }, { status: 400 });
  }

  let body: { action?: "deactivate"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action !== "deactivate") {
    return NextResponse.json({ error: "action must be 'deactivate'" }, { status: 400 });
  }

  try {
    await connectDB();

    const following = await Following.findById(followingId);
    if (!following) return NextResponse.json({ error: "Follow relationship not found" }, { status: 404 });
    if (!following.isActive) {
      return NextResponse.json({ error: "This follow relationship is already inactive" }, { status: 400 });
    }

    following.isActive = false;
    following.deactivatedAt = new Date();
    await following.save();

    await logAdminAction(req, admin, {
      action: AdminAction.DEACTIVATE_FOLLOW,
      details: "deactivated a follow relationship",
      targetType: "follower",
      targetId: String(following._id),
      reason: body.reason,
      reversible: true,
    });

    return NextResponse.json({ id: String(following._id), isActive: following.isActive });
  } catch (error) {
    console.error("[admin/followers/:followingId] failed to update follow:", error);
    return NextResponse.json({ error: "Failed to update follow relationship" }, { status: 500 });
  }
}
