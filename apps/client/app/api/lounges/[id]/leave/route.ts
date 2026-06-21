// app/api/lounges/[id]/leave/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Lounge, LoungeMember } from "@/models/lounge";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * POST /api/lounges/[id]/leave
 * ----------------------------
 * The current user leaves a lounge.
 *
 *   - Open (platform) lounge → the membership record is removed entirely;
 *     they can re-join freely just by entering again.
 *   - Creator lounge → membership status is set to "removed" (they'd need to
 *     request again to return). Their subscription is NOT touched — that's a
 *     separate concern that funds the pool regardless.
 *
 * Past messages are kept either way (leaving doesn't erase history).
 * Decrements the lounge's denormalised member count when they were a member.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const lounge = await Lounge.findById(id).select("kind");
    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });

    const viewerId = new mongoose.Types.ObjectId(user.id);
    const member = await LoungeMember.findOne({ loungeId: id, userId: viewerId });

    // Nothing to leave.
    if (!member || member.status === "removed") {
      return NextResponse.json({ success: true, alreadyOut: true });
    }

    const wasCounted = member.status === "accepted";

    if (lounge.kind === "platform") {
      await LoungeMember.deleteOne({ _id: member._id });
    } else {
      member.status = "removed";
      await member.save();
    }

    if (wasCounted) {
      await Lounge.updateOne({ _id: id, membersCount: { $gt: 0 } }, { $inc: { membersCount: -1 } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/lounges/[id]/leave]", error);
    return NextResponse.json({ error: "Failed to leave" }, { status: 500 });
  }
}