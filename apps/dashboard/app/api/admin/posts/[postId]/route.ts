// app/api/admin/posts/[postId]/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminLog, AdminAction }       from "@/models/admin-log";
import { Post, PostSeries, type ICoAuthor, type IPostReport } from "@/models/post";
import { Notification }                from "@/models/notification";
import { Comment }                     from "@/models/comment";
import { Reaction }                    from "@/models/reaction";
import { SavedPost }                   from "@/models/saved-posts";
import { Profile }                     from "@/models/profile";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

class PostDeleteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type ModerationAction = "remove" | "restore" | "feature" | "unfeature" | "set_access";

const ACTION_PERMISSION: Record<ModerationAction, keyof IAdminPermissions> = {
  remove:     "canRemovePost",
  restore:    "canRestorePost",
  feature:    "canFeaturePost",
  unfeature:  "canFeaturePost",
  // No dedicated permission flag exists for changing a post's monetization tier —
  // canManagePlatformSettings defaults to super_admin only, but (like every other
  // flag on Admin.permissions) can be granted to a specific admin without a role change.
  set_access: "canManagePlatformSettings",
};

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;

    const post = await Post.findById(postId).lean();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const coAuthors = post.coAuthors as ICoAuthor[];
    const reports   = post.reports as (IPostReport & { _id: mongoose.Types.ObjectId })[];

    const peopleIds = [
      post.authorId,
      ...coAuthors.map((c) => c.userId),
      ...reports.map((r) => r.reportedBy),
      ...reports.filter((r) => r.reviewedBy).map((r) => r.reviewedBy!),
      ...(post.removedBy ? [post.removedBy] : []),
    ];

    const [people, series, recentActions] = await Promise.all([
      db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray(),
      post.seriesId
        ? db.collection("post_series").findOne({ _id: post.seriesId }, { projection: { title: 1, postsCount: 1 } })
        : null,
      AdminLog.getActionsByTarget("post", postId),
    ]);

    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    return NextResponse.json({
      post: {
        id:      String(post._id),
        title:   post.title,
        slug:    post.slug,
        excerpt: post.excerpt,
        content: post.content,
        author:  { id: String(post.authorId), ...personOrUnknown(post.authorId) },
        coAuthors: coAuthors.map((c) => ({
          id: String(c.userId), ...personOrUnknown(c.userId),
          role: c.role, status: c.status, showOnByline: c.showOnByline,
        })),
        tags: post.tags, category: post.category, readingTime: post.readingTime,
        access: post.access, status: post.status,
        series: series ? { id: String(post.seriesId), title: series.title, postsCount: series.postsCount } : null,
        isFeatured: post.isFeatured,
        isRemoved:  post.isRemoved,
        removedBy:     post.removedBy ? personOrUnknown(post.removedBy) : null,
        removedAt:     post.removedAt,
        removalReason: post.removalReason,
        viewsCount: post.viewsCount, likesCount: post.likesCount,
        commentsCount: post.commentsCount, savesCount: post.savesCount,
        subscriberReadMinutes: post.subscriberReadMinutes,
        publishedAt: post.publishedAt, createdAt: post.createdAt, updatedAt: post.updatedAt,
      },
      reports: reports.map((r) => ({
        id: String(r._id), reason: r.reason, details: r.details,
        reportedBy: { id: String(r.reportedBy), ...personOrUnknown(r.reportedBy) },
        reportedAt: r.reportedAt, reviewed: r.reviewed,
        reviewedBy: r.reviewedBy ? { id: String(r.reviewedBy), ...personOrUnknown(r.reviewedBy) } : null,
        reviewedAt: r.reviewedAt,
      })),
      pendingReportsCount: post.pendingReportsCount,
      recentActions: recentActions.map((a) => ({
        id: String(a._id), action: a.action, details: a.details, adminName: a.adminName,
        severity: a.severity, status: a.status, reason: a.reason, createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/posts/:postId] failed to load post:", error);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  let body: { action?: ModerationAction; reason?: string; access?: "free" | "paid" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, reason, access } = body;
  if (!action || !ACTION_PERMISSION[action]) {
    return NextResponse.json({ error: "action must be one of remove, restore, feature, unfeature, set_access" }, { status: 400 });
  }
  if (action === "remove" && !reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to remove a post" }, { status: 400 });
  }
  if (action === "set_access" && access !== "free" && access !== "paid") {
    return NextResponse.json({ error: "access must be 'free' or 'paid'" }, { status: 400 });
  }
  if (!hasPermission(admin, ACTION_PERMISSION[action])) {
    return NextResponse.json({ error: "You do not have permission to perform this action" }, { status: 403 });
  }

  try {
    await connectDB();

    const post = await Post.findById(postId);
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const now = new Date();
    let adminAction: AdminAction;
    let notification: { type: "post_removed" | "post_featured"; message: string } | null = null;

    switch (action) {
      case "remove":
        post.isRemoved = true;
        post.status = "removed";
        post.removedBy = new mongoose.Types.ObjectId(admin.id);
        post.removedAt = now;
        post.removalReason = reason!.trim();
        adminAction = AdminAction.REMOVE_POST;
        notification = { type: "post_removed", message: `Your post "${post.title}" was removed: ${reason!.trim()}` };
        break;
      case "restore":
        post.isRemoved = false;
        if (post.status === "removed") post.status = "published";
        post.removedBy = undefined;
        post.removedAt = undefined;
        post.removalReason = undefined;
        adminAction = AdminAction.RESTORE_POST;
        break;
      case "feature":
        post.isFeatured = true;
        adminAction = AdminAction.FEATURE_POST;
        notification = { type: "post_featured", message: `Your post "${post.title}" was featured by the Nomeo team.` };
        break;
      case "unfeature":
        post.isFeatured = false;
        adminAction = AdminAction.UNFEATURE_POST;
        break;
      case "set_access":
        post.access = access!;
        adminAction = AdminAction.CHANGE_POST_ACCESS;
        break;
    }

    await post.save();

    await logAdminAction(req, admin, {
      action: adminAction,
      details: action === "set_access"
        ? `changed access of post "${post.title}" to ${access}`
        : `${action} post "${post.title}"`,
      targetType: "post",
      targetId: String(post._id),
      targetName: post.title,
      reason,
      reversible: true,
    });

    if (notification) {
      await Notification.create({
        recipientId: post.authorId,
        type:        notification.type,
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     notification.message,
        entityType:  "post",
        entityId:    post._id,
      });
    }

    return NextResponse.json({
      id: String(post._id),
      status: post.status,
      isRemoved: post.isRemoved,
      isFeatured: post.isFeatured,
      access: post.access,
    });
  } catch (error) {
    console.error("[admin/posts/:postId] failed to moderate post:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

/**
 * Permanently deletes a post — super_admin only, irreversible.
 *
 * Cascades to content that has no meaning without the post (comments, reactions,
 * saved-post bookmarks) and repairs the counters/series that reference it. Does
 * NOT touch PostRead or CreatorEarning: those are historical analytics/financial
 * records of events that actually happened and must not be rewritten after the
 * fact, even once the post itself is gone.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!admin.isSuperAdmin) {
    return NextResponse.json({ error: "Only a super admin can permanently delete a post" }, { status: 403 });
  }

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  let body: { reason?: string; confirmSlug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { reason, confirmSlug } = body;
  if (!reason?.trim()) {
    return NextResponse.json({ error: "A reason is required to permanently delete a post" }, { status: 400 });
  }

  try {
    await connectDB();

    const session = await mongoose.startSession();
    let deletedTitle = "";
    let deletedAuthorId: mongoose.Types.ObjectId | null = null;

    try {
      await session.withTransaction(async () => {
        const post = await Post.findById(postId).session(session);
        if (!post) throw new PostDeleteError(404, "Post not found");
        if (confirmSlug !== post.slug) {
          throw new PostDeleteError(400, "confirmSlug must match the post's slug to confirm permanent deletion");
        }

        deletedTitle = post.title;
        deletedAuthorId = post.authorId;

        const savedByUserIds = (await SavedPost.find({ postId: post._id }, { userId: 1 }).session(session))
          .map((s) => s.userId);

        await Promise.all([
          Comment.deleteMany({ postId: post._id }).session(session),
          Reaction.deleteMany({ targetType: "post", targetId: post._id }).session(session),
          SavedPost.deleteMany({ postId: post._id }).session(session),
          savedByUserIds.length
            ? Profile.updateMany({ userId: { $in: savedByUserIds } }, { $inc: { savedPostsCount: -1 } }).session(session)
            : Promise.resolve(),
          post.seriesId
            ? PostSeries.updateOne(
                { _id: post.seriesId },
                { $pull: { postIds: post._id }, $inc: { postsCount: -1 } }
              ).session(session)
            : Promise.resolve(),
          Profile.updateOne({ userId: post.authorId }, { $inc: { postsCount: -1 } }).session(session),
        ]);

        await post.deleteOne({ session });
      });
    } finally {
      await session.endSession();
    }

    await logAdminAction(req, admin, {
      action: AdminAction.HARD_DELETE_POST,
      details: `permanently deleted post "${deletedTitle}"`,
      targetType: "post",
      targetId: postId,
      targetName: deletedTitle,
      reason,
      reversible: false,
    });

    if (deletedAuthorId) {
      await Notification.create({
        recipientId: deletedAuthorId,
        type:        "post_removed",
        actorId:     new mongoose.Types.ObjectId(admin.id),
        message:     `Your post "${deletedTitle}" was permanently deleted: ${reason.trim()}`,
        entityType:  "post",
        entityId:    new mongoose.Types.ObjectId(postId),
      });
    }

    return NextResponse.json({ id: postId, deleted: true });
  } catch (error) {
    if (error instanceof PostDeleteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[admin/posts/:postId] failed to hard-delete post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
