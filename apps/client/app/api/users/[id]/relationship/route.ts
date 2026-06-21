// app/api/users/[id]/relationship/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ConnectionRequest } from "@/models/connection-request";
import { UserBlock } from "@/models/direct-message";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * GET /api/users/[id]/relationship
 * --------------------------------
 * Tells the client what it can do with another user, so a "click a user" menu
 * can show the right action:
 *
 *   status: "self" | "connected" | "request_sent" | "request_received"
 *         | "blocked" | "none"
 *   canMessage: boolean  (true only when connected and not blocked)
 *   canConnect: boolean  (true when no relationship exists yet)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: otherId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (otherId === user.id) {
      return NextResponse.json({ status: "self", canMessage: false, canConnect: false });
    }

    await connectDB();

    // Block in either direction disables everything.
    const blocked = await UserBlock.findOne({
      $or: [
        { blockerId: user.id, blockedId: otherId },
        { blockerId: otherId, blockedId: user.id },
      ],
    }).select("_id").lean();
    if (blocked) {
      return NextResponse.json({ status: "blocked", canMessage: false, canConnect: false });
    }

    const conn = await ConnectionRequest.findOne({
      $or: [
        { requesterId: user.id, recipientId: otherId },
        { requesterId: otherId, recipientId: user.id },
      ],
      status: { $in: ["pending", "accepted"] },
    }).lean<any>();

    if (conn?.status === "accepted") {
      return NextResponse.json({ status: "connected", canMessage: true, canConnect: false });
    }
    if (conn?.status === "pending") {
      const iSent = String(conn.requesterId) === user.id;
      return NextResponse.json({
        status: iSent ? "request_sent" : "request_received",
        canMessage: false,
        canConnect: false,
      });
    }

    return NextResponse.json({ status: "none", canMessage: false, canConnect: true });
  } catch (error) {
    console.error("[GET relationship]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}