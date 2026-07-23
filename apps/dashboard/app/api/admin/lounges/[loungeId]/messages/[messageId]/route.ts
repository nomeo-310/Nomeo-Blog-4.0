// app/api/admin/lounges/[loungeId]/messages/[messageId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Lounge, LoungeMessage }       from "@/models/lounge";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type MessageAction = "remove" | "restore";

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ loungeId: string; messageId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loungeId, messageId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId) || !mongoose.Types.ObjectId.isValid(messageId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { action?: MessageAction; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason } = body;
  if (action !== "remove" && action !== "restore") {
    return NextResponse.json({ error: "action must be one of remove, restore" }, { status: 400 });
  }
  if (action === "remove" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to remove a message" }, { status: 400 });
  }
  if (!hasPermission(admin, "canRemoveLoungeMessage")) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const message = await LoungeMessage.findOne({ _id: messageId, loungeId });
    if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const wasRemoved = message.isRemoved;
    const now = new Date();

    if (action === "remove") {
      message.isRemoved = true;
      message.removedBy = new mongoose.Types.ObjectId(admin.id);
      message.removedAt = now;
      message.removalReason = reason!.trim();
    } else {
      message.isRemoved = false;
      message.removedBy = undefined;
      message.removedAt = undefined;
      message.removalReason = undefined;
    }
    await message.save();

    if (action === "remove" && !wasRemoved) {
      await Lounge.updateOne({ _id: loungeId }, { $inc: { messagesCount: -1 } });
    } else if (action === "restore" && wasRemoved) {
      await Lounge.updateOne({ _id: loungeId }, { $inc: { messagesCount: 1 } });
    }

    await logAdminAction(req, admin, {
      action: action === "remove" ? AdminAction.REMOVE_LOUNGE_MESSAGE : AdminAction.RESTORE_LOUNGE_MESSAGE,
      details: `${action} message in lounge ${loungeId}`,
      targetType: "lounge_message",
      targetId: String(message._id),
      reason,
      reversible: true,
    });

    return NextResponse.json({
      id: String(message._id),
      isRemoved: message.isRemoved,
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId/messages/:messageId] failed to moderate message:", error);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}
