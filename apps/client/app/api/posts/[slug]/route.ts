// app/api/posts/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { Post } from "@/models/post";
import { Profile } from "@/models/profile";
import { getCurrentUser } from "@/lib/session";
import { createNotifications } from "@/lib/create-notification";
import { normalizeTags, adjustTopicPostCounts } from "@/services/topic-services";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/[slug]
 * Accepts either a MongoDB ObjectId OR a slug string.
 * -------------------
 * Returns a single post by id. Used by the edit page to pre-fill the form.
 * Only the post's author (or a co-author) can fetch draft/archived posts.
 * Published posts are publicly readable.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();
    await connectDB();

    // Accept either a MongoDB ObjectId (from dashboard) or a slug string (from public routes)
    const post = mongoose.isValidObjectId(slug)
      ? await Post.findById(slug).lean<any>()
      : await Post.findOne({ slug }).lean<any>();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // Non-published posts are only visible to the author / co-authors
    const isAuthor = user && String(post.authorId) === user.id;
    const isCoAuthor = user && post.coAuthors?.some(
      (ca: any) => String(ca.userId) === user.id && ca.status === "accepted"
    );
    if (post.status !== "published" && !isAuthor && !isCoAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id:           String(post._id),
      title:        post.title,
      slug:         post.slug,
      excerpt:      post.excerpt ?? "",
      content:      post.content,
      coverImage:   post.coverImage ?? null,
      category:     post.category ?? "",
      tags:         post.tags ?? [],
      access:       post.access,
      status:       post.status,
      sendAsNewsletter: post.sendAsNewsletter ?? false,
      seriesId:     post.seriesId ? String(post.seriesId) : null,
      seriesOrder:  post.seriesOrder ?? null,
      coAuthors: (post.coAuthors ?? []).map((ca: any) => ({
        userId:       String(ca.userId),
        role:         ca.role,
        status:       ca.status,
        showOnByline: ca.showOnByline,
      })),
    });
  } catch (err) {
    console.error("[GET /api/posts/[slug]]", err);
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}

/**
 * PATCH /api/posts/[slug]
 * Accepts either a MongoDB ObjectId OR a slug string.
 * ----------------------
 * Updates an existing post. Author only.
 * Accepts any subset of: title, excerpt, content, coverImage,
 *                        category, tags, access, status, sendAsNewsletter
 *
 * Recomputes readingTime when content changes.
 * Sets publishedAt when transitioning draft → published.
 * Increments postsCount on first publish.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const post = mongoose.isValidObjectId(slug)
      ? await Post.findById(slug)
      : await Post.findOne({ slug });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (String(post.authorId) !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      title, excerpt, content, coverImage,
      category, tags, access, status, sendAsNewsletter,
      seriesId, seriesOrder, coAuthors,
    } = body;

    const wasPublished = post.status === "published";
    const isPublishing = status === "published";

    // Validate required fields
    if (title !== undefined && !title?.trim())
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    if (content !== undefined && !content?.trim())
      return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 });
    if (isPublishing && !((excerpt ?? post.excerpt)?.trim()))
      return NextResponse.json({ error: "Excerpt is required before publishing" }, { status: 400 });

    // Tags go through the Topic vocabulary (aliases/merges resolved, banned
    // dropped, new words create-on-first-use) — normalize before building
    // the update object since this needs a DB round trip.
    const normalizedTags = tags !== undefined ? await normalizeTags(tags) : undefined;

    // Build update object — only update fields that were sent
    const update: Record<string, any> = {};
    let newlyInvitedCoAuthors: Array<{ userId: mongoose.Types.ObjectId; role: string }> = [];

    if (title     !== undefined) update.title    = title.trim();
    if (excerpt   !== undefined) update.excerpt  = excerpt.trim();
    if (category  !== undefined) update.category = category.trim();
    if (normalizedTags !== undefined) update.tags = normalizedTags;
    if (access    !== undefined) update.access   = access === "paid" ? "paid" : "free";
    if (status    !== undefined) update.status   = status;
    if (sendAsNewsletter !== undefined) update.sendAsNewsletter = !!sendAsNewsletter;

    if (seriesId !== undefined) {
      update.seriesId = seriesId
        ? new mongoose.Types.ObjectId(seriesId)
        : null;
    }
    if (seriesOrder !== undefined) {
      update.seriesOrder = seriesOrder ? Number(seriesOrder) : undefined;
    }
    if (coAuthors !== undefined && Array.isArray(coAuthors)) {
      // Preserve existing accepted/pending statuses — only update role/showOnByline
      // for entries that already exist; add new ones as pending; don't remove accepted ones
      const existingMap = new Map<string, any>(
        (post.coAuthors ?? []).map((ca: any) => [String(ca.userId), ca])
      );
      update.coAuthors = coAuthors
        .filter((ca: any) => mongoose.isValidObjectId(ca.userId) && ca.userId !== user.id)
        .map((ca: any) => {
          const existing = existingMap.get(String(ca.userId));
          return existing
            ? { ...existing, role: ca.role ?? existing.role, showOnByline: ca.showOnByline ?? existing.showOnByline }
            : {
                userId:       new mongoose.Types.ObjectId(ca.userId),
                role:         ["writer","editor","reviewer"].includes(ca.role) ? ca.role : "writer",
                status:       "pending",
                showOnByline: ca.showOnByline !== false,
                invitedAt:    new Date(),
              };
        });

      // Track which entries are brand new (weren't in existingMap) so we can
      // notify only the newly invited co-authors, not ones already pending/accepted.
      newlyInvitedCoAuthors = update.coAuthors.filter(
        (ca: any) => !existingMap.has(String(ca.userId))
      );
    }

    // Cover image — store as { secureUrl, publicId }
    if (coverImage !== undefined) {
      update.coverImage = coverImage
        ? { secureUrl: coverImage.secureUrl || coverImage.url || "", publicId: coverImage.publicId || "" }
        : { secureUrl: "", publicId: "" };
    }

    // Recompute reading time if content changed
    if (content !== undefined) {
      update.content     = content.trim();
      update.readingTime = Math.max(1, Math.round(
        content.trim().split(/\s+/).filter(Boolean).length / 200
      ));
    }

    // Set publishedAt on first publish
    if (isPublishing && !wasPublished) {
      update.publishedAt = new Date();
    }

    await Post.findByIdAndUpdate(post._id, { $set: update });

    // Increment postsCount on first publish
    if (isPublishing && !wasPublished) {
      await Profile.updateOne(
        { userId: new mongoose.Types.ObjectId(user.id) },
        { $inc: { postsCount: 1 } }
      );
    }

    // Topic.postsCount only counts published posts — diff whatever was
    // counted before this edit against what should be counted after it,
    // covering tag changes, publish, and unpublish in one pass.
    {
      const effectiveStatus = update.status ?? post.status;
      const effectiveTags: string[] = update.tags ?? post.tags ?? [];
      const oldCounted = wasPublished ? (post.tags ?? []) : [];
      const newCounted = effectiveStatus === "published" ? effectiveTags : [];
      const removed = oldCounted.filter((t: string) => !newCounted.includes(t));
      const added   = newCounted.filter((t: string) => !oldCounted.includes(t));
      if (removed.length > 0 || added.length > 0) {
        await adjustTopicPostCounts(removed, added);
      }
    }

    // ── Notify newly invited co-authors only ─────────────────────────────
    if (newlyInvitedCoAuthors.length > 0) {
      const authorProfile = await Profile.findOne(
        { userId: new mongoose.Types.ObjectId(user.id) },
        { displayName: 1, username: 1 }
      ).lean() as any;

      const authorName = authorProfile?.displayName || authorProfile?.username || "A creator";
      const postTitle  = update.title ?? post.title;

      await createNotifications(
        newlyInvitedCoAuthors.map((ca) => ({
          recipientId: ca.userId,
          type:        "coauthor_invited",
          actorId:     user.id,
          message:     `${authorName} invited you to co-author "${postTitle}" as ${ca.role}.`,
          entityType:  "post" as const,
          entityId:    post._id,
        }))
      );
    }

    return NextResponse.json({ success: true, status: update.status ?? post.status });
  } catch (err) {
    console.error("[PATCH /api/posts/[slug]]", err);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}