// app/api/dm/conversations/[id]/messages/[messageId]/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { DirectMessage } from "@/models/direct-message";
import { getCurrentUser } from "@/lib/session";
import { assertCanUseConversation } from "@/services/dm-access-services";
import { connectDB } from "@/lib/connect-to-database";

const REASONS = ["spam", "harassment", "hate_speech", "sexual_content", "threat", "other"];

/**
 * POST /api/dm/conversations/[id]/messages/[messageId]/report { reason, note? }
 * Files a moderation report against a direct message. One report per user per
 * message (idempotent via the reporter check).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const { id, messageId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { reason, note } = await req.json();
    if (!REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    await connectDB();
    await assertCanUseConversation(id, user.id); // must be a participant

    // Add the report only if this user hasn't already reported this message.
    await DirectMessage.updateOne(
      { _id: new mongoose.Types.ObjectId(messageId), conversationId: id, "reports.reporterId": { $ne: new mongoose.Types.ObjectId(user.id) } },
      {
        $push: {
          reports: {
            reporterId: new mongoose.Types.ObjectId(user.id),
            reason,
            note: typeof note === "string" ? note.slice(0, 500) : undefined,
            reportedAt: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message;
    const status = ["NOT_FOUND", "NOT_A_PARTICIPANT", "NOT_CONNECTED", "BLOCKED"].includes(msg) ? 403 : 500;
    if (status === 500) console.error("[POST dm report]", error);
    return NextResponse.json({ error: msg || "Failed to report" }, { status });
  }
}