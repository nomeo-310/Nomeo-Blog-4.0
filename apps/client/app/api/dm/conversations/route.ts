// app/api/dm/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Conversation } from "@/models/direct-message";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";
import { getOrCreateConversation } from "@/services/dm-access-services";

/**
 *  GET  /api/dm/conversations          → my inbox (conversations list)
 *  POST /api/dm/conversations { otherId } → get-or-create a conversation
 *                                           (connection + block checked)
 */

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const me = new mongoose.Types.ObjectId(user.id);

    const convos = await Conversation.find({
      participants: me,
      hiddenFor: { $ne: me },
    })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .populate("participants", "name image")
      .lean();

    const conversations = convos.map((c: any) => {
      const other = (c.participants ?? []).find((p: any) => String(p._id) !== user.id);
      return {
        id: String(c._id),
        other: other ? { id: String(other._id), name: other.name, image: other.image ?? null } : null,
        lastMessage: c.lastMessage
          ? { body: c.lastMessage.body, senderId: String(c.lastMessage.senderId), sentAt: c.lastMessage.sentAt }
          : null,
        lastMessageAt: c.lastMessageAt ?? null,
        unread: c.unread?.[user.id] ?? 0,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[GET /api/dm/conversations]", error);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { otherId } = await req.json();
    if (!otherId) return NextResponse.json({ error: "otherId is required" }, { status: 400 });

    const convo = await getOrCreateConversation(user.id, otherId);
    return NextResponse.json({ conversationId: String(convo._id) }, { status: 200 });
  } catch (error) {
    const msg = (error as Error).message;
    const status = msg === "NOT_CONNECTED" ? 403 : msg === "BLOCKED" ? 403 : msg === "SELF" ? 400 : 500;
    return NextResponse.json({ error: msg || "Failed" }, { status });
  }
}