// app/api/notifications/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Notification } from "@/models/notification";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * POST /api/notifications/read
 *   { ids: string[] }   → mark those notifications read
 *   { all: true }       → mark ALL of the user's notifications read
 *
 * Scoped to the caller (recipientId in the filter), so you can only ever mark
 * your own notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids, all } = await req.json();
    await connectDB();
    const me = new mongoose.Types.ObjectId(user.id);
    const now = new Date();

    if (all === true) {
      await Notification.updateMany({ recipientId: me, isRead: false }, { $set: { isRead: true, readAt: now } });
    } else if (Array.isArray(ids) && ids.length > 0) {
      const valid = ids.filter((i) => mongoose.isValidObjectId(i)).map((i) => new mongoose.Types.ObjectId(i));
      await Notification.updateMany(
        { _id: { $in: valid }, recipientId: me, isRead: false },
        { $set: { isRead: true, readAt: now } }
      );
    } else {
      return NextResponse.json({ error: "Provide ids[] or all:true" }, { status: 400 });
    }

    const unreadCount = await Notification.countDocuments({ recipientId: me, isRead: false });
    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error("[POST /api/notifications/read]", error);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}