// app/api/admin/followers/bulk/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Following }                   from "@/models/following";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BULK = 200;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfterSeconds } = await rateLimit({ key: `followers-bulk:${ip}`, limit: 15, windowSeconds: 10 * 60 });
  if (!allowed) return rateLimitResponse(retryAfterSeconds);

  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[]; action?: "deactivate"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = (body.ids ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (ids.length === 0) return NextResponse.json({ error: "At least one valid id is required" }, { status: 400 });
  if (ids.length > MAX_BULK) return NextResponse.json({ error: `Cannot process more than ${MAX_BULK} at once` }, { status: 400 });
  if (body.action !== "deactivate") {
    return NextResponse.json({ error: "action must be 'deactivate'" }, { status: 400 });
  }

  try {
    await connectDB();

    const result = await Following.updateMany(
      { _id: { $in: ids }, isActive: true },
      { $set: { isActive: false, deactivatedAt: new Date() } }
    );

    await logAdminAction(req, admin, {
      action: AdminAction.DEACTIVATE_FOLLOW,
      details: `bulk-deactivated ${result.modifiedCount} follow relationship(s)`,
      targetType: "follower",
      reason: body.reason,
      reversible: true,
      affectedCount: result.modifiedCount,
    });

    return NextResponse.json({ requested: ids.length, updated: result.modifiedCount });
  } catch (error) {
    console.error("[admin/followers/bulk] failed to bulk-deactivate:", error);
    return NextResponse.json({ error: "Failed to update follow relationships" }, { status: 500 });
  }
}
