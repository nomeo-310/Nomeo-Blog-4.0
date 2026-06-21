// app/api/dm/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Conversation, DirectMessage } from "@/models/direct-message";
import { publishToDm } from "@/lib/server/ably";
import { getCurrentUser } from "@/lib/session";
import { assertCanUseConversation } from "@/services/dm-access-services";
import { connectDB } from "@/lib/connect-to-database";

/**
 *  GET  /api/dm/conversations/[id]/messages?before=<id>&limit=30  → history
 *  POST /api/dm/conversations/[id]/messages { body, clientTempId? } → send
 *
 * Send: re-checks the relationship (connection + block) every time, persists
 * to MongoDB, updates the conversation preview + unread, then broadcasts via
 * Ably on channel `dm:<conversationId>`.
 */

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    await assertCanUseConversation(id, user.id); // throws if not allowed

    const { searchParams } = new URL(req.url);
    const before = searchParams.get("before");
    const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_LIMIT, MAX_LIMIT);

    const query: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(id),
      isRemoved: { $ne: true },
    };
    if (before && mongoose.isValidObjectId(before)) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const docs = await DirectMessage.find(query).sort({ _id: -1 }).limit(limit).lean();

    // Mark the other party's messages as read for this viewer, reset unread.
    await Conversation.updateOne({ _id: id }, { $set: { [`unread.${user.id}`]: 0 } });

    const messages = docs.reverse().map(serializeDm);
    return NextResponse.json({ messages, hasMore: docs.length === limit });
  } catch (error) {
    return handleErr(error, "GET messages");
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body, clientTempId } = await req.json();
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

    await connectDB();
    const { otherId } = await assertCanUseConversation(id, user.id); // re-check every send

    // Idempotent retry.
    if (clientTempId) {
      const existing = await DirectMessage.findOne({ conversationId: id, clientTempId }).lean();
      if (existing) return NextResponse.json({ message: serializeDm(existing) }, { status: 200 });
    }

    const created = await DirectMessage.create({
      conversationId: new mongoose.Types.ObjectId(id),
      senderId: new mongoose.Types.ObjectId(user.id),
      body: text,
      clientTempId,
    });

    // Update conversation preview + bump unread for the recipient.
    await Conversation.updateOne(
      { _id: id },
      {
        $set: {
          lastMessage: { body: text.slice(0, 200), senderId: new mongoose.Types.ObjectId(user.id), sentAt: created.createdAt },
          lastMessageAt: created.createdAt,
        },
        $inc: { [`unread.${otherId}`]: 1 },
        // Un-hide for both if either had hidden the thread (a new message resurfaces it).
        $pull: { hiddenFor: { $in: [new mongoose.Types.ObjectId(user.id), new mongoose.Types.ObjectId(otherId)] } },
      }
    );

    const message = serializeDm(created.toObject());
    publishToDm(id, "message.new", message).catch((e) => console.error("[ably dm publish]", e));

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return handleErr(error, "POST message");
  }
}

function serializeDm(m: any) {
  return {
    id: String(m._id),
    conversationId: String(m.conversationId),
    senderId: String(m.senderId),
    body: m.isDeleted ? null : m.body,
    isDeleted: !!m.isDeleted,
    clientTempId: m.clientTempId ?? null,
    readAt: m.readAt ? new Date(m.readAt).toISOString() : null,
    isEdited: !!m.isEdited,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
  };
}

function handleErr(error: unknown, where: string) {
  const msg = (error as Error).message;
  const map: Record<string, number> = {
    NOT_FOUND: 404,
    NOT_A_PARTICIPANT: 403,
    NOT_CONNECTED: 403,
    BLOCKED: 403,
  };
  if (map[msg]) return NextResponse.json({ error: msg }, { status: map[msg] });
  console.error(`[DM ${where}]`, error);
  return NextResponse.json({ error: "Failed" }, { status: 500 });
}