// app/api/dm/block/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { UserBlock } from "@/models/direct-message";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 *  POST   /api/dm/block { targetId }  → block a user
 *  DELETE /api/dm/block { targetId }  → unblock
 *
 * Blocking is one-directional but the access layer treats EITHER side's block
 * as disabling messaging for both.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetId } = await req.json();
    if (!targetId || targetId === user.id) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    await connectDB();
    await UserBlock.updateOne(
      { blockerId: new mongoose.Types.ObjectId(user.id), blockedId: new mongoose.Types.ObjectId(targetId) },
      { $setOnInsert: { blockerId: user.id, blockedId: targetId } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/dm/block]", error);
    return NextResponse.json({ error: "Failed to block" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { targetId } = await req.json();
    if (!targetId) return NextResponse.json({ error: "Invalid target" }, { status: 400 });

    await connectDB();
    await UserBlock.deleteOne({
      blockerId: new mongoose.Types.ObjectId(user.id),
      blockedId: new mongoose.Types.ObjectId(targetId),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/dm/block]", error);
    return NextResponse.json({ error: "Failed to unblock" }, { status: 500 });
  }
}