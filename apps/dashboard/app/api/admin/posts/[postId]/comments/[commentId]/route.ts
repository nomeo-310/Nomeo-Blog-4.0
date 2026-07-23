// app/api/admin/posts/[postId]/comments/[commentId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Comment }                     from "@/models/comment";
import { Post }                        from "@/models/post";
import { Notification }                from "@/models/notification";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

type CommentAction = "remove" | "restore";

const ACTION_PERMISSION: Record<CommentAction, keyof IAdminPermissions> = {
  remove:  "canRemoveComment",
  restore: "canRestoreComment",
};

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId, commentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { action?: CommentAction; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason } = body;
  if (!action || !ACTION_PERMISSION[action]) {
    return NextResponse.json({ error: "action must be one of remove, restore" }, { status: 400 });
  }
  if (action === "remove" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to remove a comment" }, { status: 400 });
  }
  if (!hasPermission(admin, ACTION_PERMISSION[action])) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const comment = await Comment.findOne({ _id: commentId, postId });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

    const wasRemoved = comment.isRemoved;
    const now = new Date();

    if (action === "remove") {
      comment.isRemoved = true;
      comment.status = "removed";
      comment.removedBy = new mongoose.Types.ObjectId(admin.id);
      comment.removedAt = now;
      comment.removalReason = reason!.trim();
    } else {
      comment.isRemoved = false;
      if (comment.status === "removed") comment.status = "visible";
      comment.removedBy = undefined;
      comment.removedAt = undefined;
      comment.removalReason = undefined;
    }
    await comment.save();

    // Post.commentsCount reflects visible comments — keep it in sync with the toggle.
    if (action === "remove" && !wasRemoved) {
      await Post.updateOne({ _id: postId }, { $inc: { commentsCount: -1 } });
    } else if (action === "restore" && wasRemoved) {
      await Post.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } });
    }

    await logAdminAction(req, admin, {
      action: action === "remove" ? AdminAction.REMOVE_COMMENT : AdminAction.RESTORE_COMMENT,
      details: `${action} comment on post ${postId}`,
      targetType: "comment",
      targetId: String(comment._id),
      reason,
      reversible: true,
    });

    if (action === "remove") {
      await Notification.create({
        recipientId: comment.authorId,
        type:        "comment_removed",
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     `Your comment was removed: ${reason!.trim()}`,
        entityType:  "comment",
        entityId:    comment._id,
      });
    }

    return NextResponse.json({
      id: String(comment._id),
      status: comment.status,
      isRemoved: comment.isRemoved,
    });
  } catch (error) {
    console.error("[admin/posts/:postId/comments/:commentId] failed to moderate comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}
