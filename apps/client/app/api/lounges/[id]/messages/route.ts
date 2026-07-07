// app/api/lounges/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Lounge, LoungeMessage } from "@/models/lounge";
import { publishToLounge } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";
import { resolveLoungeAccess } from "@/services/lounge-access-services";
import { connectDB } from "@/lib/connect-to-database";
import { User } from "@/models/user";

/**
 * Lounge messages.
 *
 *   GET  /api/lounges/[id]/messages?before=<id>&limit=30
 *        → page of recent messages (initial load + scroll-back). Newest last.
 *
 *   POST /api/lounges/[id]/messages   { body, clientTempId?, replyToId? }
 *        → access-checked, persisted to MongoDB, then broadcast via Ably.
 *
 * Transport (Ably) is fire-and-forget AFTER the DB write — the message is
 * saved even if the broadcast fails; clients also load history on join, so a
 * dropped broadcast self-heals on next fetch.
 */

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const access = await resolveLoungeAccess(id, user.id);
    if (!access.canView) {
      return NextResponse.json({ error: "Forbidden", reason: access.reason }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const before = searchParams.get("before");
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

    const query: Record<string, unknown> = { loungeId: new mongoose.Types.ObjectId(id), isRemoved: { $ne: true } };
    if (before && mongoose.isValidObjectId(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    // newest first for the query, reversed to chronological for the client
    const docs = await LoungeMessage.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate({ path: "authorId", model: User, select: "name image" })
      .lean();

    const messages = docs.reverse().map(serializeMessage);
    return NextResponse.json({ messages, hasMore: docs.length === limit });
  } catch (error) {
    console.error("[GET /api/lounges/[id]/messages]", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body, clientTempId, replyToId } = await req.json();
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

    await connectDB();

    // Re-check access on every send — never trust that the token is enough.
    const access = await resolveLoungeAccess(id, user.id);
    if (!access.canChat) {
      return NextResponse.json({ error: "Forbidden", reason: access.reason }, { status: 403 });
    }

    const lounge = await Lounge.findById(id).select("maxMessageLength slowModeSeconds");
    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });

    const cap = lounge.maxMessageLength ?? 4000;
    if (text.length > cap) {
      return NextResponse.json({ error: `Message too long (max ${cap})` }, { status: 400 });
    }

    // Idempotency: if this clientTempId already saved (retry), return it.
    if (clientTempId) {
      const existing = await LoungeMessage.findOne({ loungeId: id, clientTempId }).populate({ path: "authorId", model: User, select: "name image" }).lean();
      if (existing) return NextResponse.json({ message: serializeMessage(existing) }, { status: 200 });
    }

    const created = await LoungeMessage.create({
      loungeId: new mongoose.Types.ObjectId(id),
      authorId: new mongoose.Types.ObjectId(user.id),
      body: text,
      clientTempId,
      deliveryStatus: "delivered",
      replyToId: replyToId && mongoose.isValidObjectId(replyToId) ? new mongoose.Types.ObjectId(replyToId) : null,
    });

    await Lounge.updateOne({ _id: id }, { $inc: { messagesCount: 1 } });

    const populated = await LoungeMessage.findById(created._id).populate({ path: "authorId", model: User, select: "name image" }).lean();
    const message = serializeMessage(populated);

    // Broadcast after persistence. Fire-and-forget: history covers drops.
    publishToLounge(id, "message.new", message).catch((e) =>
      console.error("[ably publish] message.new failed", e)
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/lounges/[id]/messages]", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

function serializeMessage(m: any) {
  const author = m.authorId && typeof m.authorId === "object" ? m.authorId : null;
  const deleted = !!m.isDeletedByAuthor || !!m.isRemoved;
  return {
    id: String(m._id),
    body: deleted ? "" : m.body,
    isDeleted: deleted,
    clientTempId: m.clientTempId ?? null,
    replyToId: m.replyToId ? String(m.replyToId) : null,
    isEdited: !!m.isEdited,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
    author: author
      ? { id: String(author._id), name: author.name, image: author.image ?? null }
      : { id: String(m.authorId), name: "Member", image: null },
  };
}