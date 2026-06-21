// app/api/lounges/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Lounge } from "@/models/lounge";
import { Profile } from "@/models/profile";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";
import { resolveLoungeAccess } from "@/services/lounge-access-services";

/**
 * GET /api/lounges/[id]
 * ---------------------
 * Single lounge detail for the room page: metadata, rules, creator, counts,
 * PLUS the viewer's access (canView / canChat / reason) so the page can show
 * either the chat or the appropriate gate (subscribe / sign-in).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });
    }

    await connectDB();
    const user = await getCurrentUser();

    const lounge = await Lounge.findById(id).lean<any>();
    if (!lounge || lounge.status !== "active") {
      return NextResponse.json({ error: "Lounge not found" }, { status: 404 });
    }

    let creator = null;
    if (lounge.creatorId) {
      const p = await Profile.findOne({ userId: lounge.creatorId })
        .select("userId displayName username profileImage")
        .lean<any>();
      if (p) {
        creator = {
          id: String(p.userId),
          displayName: p.displayName,
          username: p.username,
          avatar: p.profileImage?.url ?? null,
        };
      }
    }

    // Viewer's access (guests get canView:false, reason not_authenticated).
    const access = user
      ? await resolveLoungeAccess(id, user.id)
      : { canView: false, canChat: false, reason: "not_authenticated" as const };

    return NextResponse.json({
      lounge: {
        id: String(lounge._id),
        kind: lounge.kind,
        accessType: lounge.accessType,
        name: lounge.name,
        description: lounge.description ?? "",
        coverImage: lounge.coverImage ?? null,
        rules: lounge.rules ?? [],
        membersCount: lounge.membersCount ?? 0,
        messagesCount: lounge.messagesCount ?? 0,
        isMuted: !!lounge.isMuted,
        creator,
      },
      access,
    });
  } catch (error) {
    console.error("[GET /api/lounges/[id]]", error);
    return NextResponse.json({ error: "Failed to load lounge" }, { status: 500 });
  }
}

/**
 * PATCH /api/lounges/[id]
 * ------------------------
 * Updates an existing creator lounge. Creator/owner only.
 * Accepts any subset of: name, description, coverImage, rules
 */
export async function PATCH( req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id))
      return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const lounge = await Lounge.findById(id);
    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });
    if (String(lounge.creatorId) !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, description, coverImage, rules } = body;

    if (name !== undefined && !name?.trim())
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    if (name?.trim().length > 100)
      return NextResponse.json({ error: "Name must be 100 characters or less" }, { status: 400 });

    const update: Record<string, any> = {};

    if (name        !== undefined) update.name        = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (rules       !== undefined) update.rules       = Array.isArray(rules)
      ? rules.map((r: string) => r.trim()).filter(Boolean).slice(0, 20)
      : [];

    if (coverImage !== undefined) {
      update.coverImage = coverImage
        ? { secureUrl: coverImage.secureUrl || coverImage.url || "", publicId: coverImage.publicId || "" }
        : { secureUrl: "", publicId: "" };
    }

    await Lounge.findByIdAndUpdate(id, { $set: update });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/lounges/[id]]", err);
    return NextResponse.json({ error: "Failed to update lounge" }, { status: 500 });
  }
}