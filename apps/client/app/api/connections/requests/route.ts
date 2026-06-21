// app/api/connections/requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ConnectionRequest } from "@/models/connection-request";
import { Profile } from "@/models/profile";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * GET /api/connections/requests?direction=incoming|outgoing
 * ---------------------------------------------------------
 * Lists pending connection requests for the current user. Default "incoming"
 * (requests awaiting YOUR response — what the Connections tab needs), with the
 * requester's display details joined. Also returns pendingCount (incoming).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const me = new mongoose.Types.ObjectId(user.id);
    const direction = new URL(req.url).searchParams.get("direction") ?? "incoming";

    const match =
      direction === "outgoing"
        ? { requesterId: me, status: "pending" }
        : { recipientId: me, status: "pending" };

    const docs = await ConnectionRequest.find(match).sort({ createdAt: -1 }).limit(50).lean();

    // The "other" person is the requester (incoming) or recipient (outgoing).
    const otherIds = docs.map((d: any) => (direction === "outgoing" ? d.recipientId : d.requesterId));
    const profiles = otherIds.length
      ? await Profile.find({ userId: { $in: otherIds } }).select("userId displayName username profileImage bio").lean()
      : [];
    const byUser = new Map(profiles.map((p: any) => [String(p.userId), p]));

    const requests = docs.map((r: any) => {
      const otherId = direction === "outgoing" ? r.recipientId : r.requesterId;
      const p = byUser.get(String(otherId));
      return {
        id: String(r._id),
        message: r.message ?? null,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        user: p
          ? { id: String(p.userId), name: p.displayName, username: p.username, avatar: p.profileImage?.url ?? null, bio: p.bio ?? null }
          : { id: String(otherId), name: "User", username: "", avatar: null, bio: null },
      };
    });

    const pendingCount = await ConnectionRequest.countDocuments({ recipientId: me, status: "pending" });

    return NextResponse.json({ requests, pendingCount });
  } catch (error) {
    console.error("[GET /api/connections/requests]", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}