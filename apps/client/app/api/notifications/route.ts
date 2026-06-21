// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Notification } from "@/models/notification";
import { Profile } from "@/models/profile";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * GET /api/notifications?filter=all|unread&types=a,b,c&page=1&limit=20
 *
 * Supports:
 *   filter — "all" (default) or "unread"
 *   types  — comma-separated notification type list (for the full page filter)
 *   page   — 1-based page number (for the full page)
 *   before — cursor id (for the slider's infinite scroll)
 *   limit  — page size
 * ------------------------------------------------------------
 * The current user's notifications, newest first, with the actor's display
 * details joined (for an avatar + name in the row). Also returns unreadCount.
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const me = new mongoose.Types.ObjectId(user.id);

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") ?? "all";
    const before = searchParams.get("before");
    const typesParam = searchParams.get("types");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = before ? 0 : (page - 1) * limit;

    const query: Record<string, unknown> = { recipientId: me };
    if (filter === "unread") query.isRead = false;
    if (before && mongoose.isValidObjectId(before)) query._id = { $lt: new mongoose.Types.ObjectId(before) };
    if (typesParam) {
      const types = typesParam.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length) query.type = { $in: types };
    }

    const [docs, total] = await Promise.all([
      Notification.find(query).sort({ _id: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query),
    ]);

    // Join actor display details (batched).
    const actorIds = docs.filter((d: any) => d.actorId).map((d: any) => d.actorId);
    const profiles = actorIds.length
      ? await Profile.find({ userId: { $in: actorIds } }).select("userId displayName username profileImage").lean()
      : [];
    const byUser = new Map(profiles.map((p: any) => [String(p.userId), p]));

    const notifications = docs.map((n: any) => {
      const actor = n.actorId ? byUser.get(String(n.actorId)) : null;
      return {
        id: String(n._id),
        type: n.type,
        message: n.message,
        isRead: !!n.isRead,
        entityType: n.entityType ?? null,
        entityId: n.entityId ? String(n.entityId) : null,
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : null,
        actor: actor
          ? { id: String(actor.userId), name: actor.displayName, username: actor.username, avatar: actor.profileImage?.url ?? null }
          : null,
      };
    });

    const unreadCount = await Notification.countDocuments({ recipientId: me, isRead: false });

    return NextResponse.json({ notifications, unreadCount, total, hasMore: docs.length === limit });
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}