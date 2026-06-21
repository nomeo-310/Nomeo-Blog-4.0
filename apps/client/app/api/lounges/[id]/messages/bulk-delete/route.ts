// app/api/lounges/[id]/messages/bulk-delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { LoungeMessage } from "@/models/lounge";
import { publishToLounge } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * POST /api/lounges/[id]/messages/bulk-delete  { messageIds: string[] }
 * --------------------------------------------------------------------
 * Soft-deletes multiple of the CALLER'S OWN messages at once. Only messages
 * authored by the caller are affected (the filter enforces authorId), so you
 * can never bulk-delete someone else's messages even if you pass their ids.
 * Broadcasts each deletion so other clients update live.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { messageIds } = await req.json();
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: "messageIds required" }, { status: 400 });
    }
    const validIds = messageIds.filter((m) => mongoose.isValidObjectId(m)).slice(0, 100);
    if (validIds.length === 0) return NextResponse.json({ error: "No valid ids" }, { status: 400 });

    await connectDB();

    // authorId in the filter guarantees only the caller's own messages match.
    await LoungeMessage.updateMany(
      { _id: { $in: validIds }, loungeId: id, authorId: new mongoose.Types.ObjectId(user.id) },
      { $set: { isDeletedByAuthor: true } }
    );

    // Broadcast each deletion (best-effort).
    for (const mid of validIds) {
      publishToLounge(id, "message.deleted", { id: mid }).catch(() => {});
    }

    return NextResponse.json({ success: true, deleted: validIds.length });
  } catch (error) {
    console.error("[POST bulk-delete lounge]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}