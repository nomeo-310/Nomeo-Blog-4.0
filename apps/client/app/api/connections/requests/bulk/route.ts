// app/api/connections/requests/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ConnectionRequest } from "@/models/connection-request";
import { Following } from "@/models/following";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * POST /api/connections/requests/bulk  { action: "accept" | "decline" }
 * ---------------------------------------------------------------------
 * Accept or decline ALL of the current user's pending incoming requests.
 * Accept also creates the Following edges in bulk.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action } = await req.json();
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();
    const me = new mongoose.Types.ObjectId(user.id);
    const now = new Date();

    const pending = await ConnectionRequest.find({ recipientId: me, status: "pending" }).select("_id requesterId").lean();
    if (pending.length === 0) return NextResponse.json({ success: true, count: 0 });

    if (action === "accept") {
      await ConnectionRequest.updateMany(
        { recipientId: me, status: "pending" },
        { $set: { status: "accepted", respondedAt: now } }
      );
      // Bulk-create Following edges (requester → me).
      const ops = pending.map((r: any) => ({
        updateOne: {
          filter: { followerId: r.requesterId, followingId: me },
          update: { $set: { isActive: true }, $setOnInsert: { followerId: r.requesterId, followingId: me } },
          upsert: true,
        },
      }));
      if (ops.length) await Following.bulkWrite(ops);
    } else {
      await ConnectionRequest.updateMany(
        { recipientId: me, status: "pending" },
        { $set: { status: "declined", respondedAt: now, canResendAfter: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14) } }
      );
    }

    return NextResponse.json({ success: true, count: pending.length });
  } catch (error) {
    console.error("[POST /api/connections/requests/bulk]", error);
    return NextResponse.json({ error: "Failed bulk action" }, { status: 500 });
  }
}