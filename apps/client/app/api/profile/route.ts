// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/profile
 * -------------------
 * Updates the authenticated user's profile document.
 * Accepts any subset of:
 *   displayName, pronouns, bio, about, location, occupation,
 *   socialLinks: { twitter, linkedin, github, website, instagram },
 *   profileImage: { url, publicId }   — set by the image cropper
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const body = await req.json();
    const {
      displayName, pronouns, bio, about,
      location, occupation, socialLinks, profileImage, coverImage,
    } = body;

    const $set: Record<string, any> = {};

    if (displayName !== undefined) $set.displayName = String(displayName).trim().slice(0, 100);
    if (pronouns    !== undefined) $set.pronouns    = String(pronouns).trim().slice(0, 30);
    if (bio         !== undefined) $set.bio         = String(bio).trim().slice(0, 500);
    if (about       !== undefined) $set.about       = String(about).trim().slice(0, 5000);
    if (location    !== undefined) $set.location    = String(location).trim().slice(0, 100);
    if (occupation  !== undefined) $set.occupation  = String(occupation).trim().slice(0, 100);

    if (socialLinks !== undefined) {
      if (socialLinks.twitter   !== undefined) $set["socialLinks.twitter"]   = String(socialLinks.twitter   || "").trim();
      if (socialLinks.linkedin  !== undefined) $set["socialLinks.linkedin"]  = String(socialLinks.linkedin  || "").trim();
      if (socialLinks.github    !== undefined) $set["socialLinks.github"]    = String(socialLinks.github    || "").trim();
      if (socialLinks.website   !== undefined) $set["socialLinks.website"]   = String(socialLinks.website   || "").trim();
      if (socialLinks.instagram !== undefined) $set["socialLinks.instagram"] = String(socialLinks.instagram || "").trim();
    }

    // Profile image — sent as { url, publicId, width?, height? } from ImageCropper.
    // IMPORTANT: set the whole object in one go, not dot-notation sub-fields.
    // Mongo's dot-notation $set (e.g. "profileImage.url") fails with error code 28
    // ("Cannot create field 'x' in element {profileImage: null}") whenever the
    // existing value is null — dot-paths can only descend into objects or
    // genuinely missing fields, never into null. Replacing the whole object
    // sidesteps that entirely and works whether the prior value was null,
    // missing, or already an object.
    if (profileImage !== undefined) {
      $set.profileImage = {
        url:      String(profileImage.url      || ""),
        publicId: String(profileImage.publicId || ""),
        width:    profileImage.width  != null ? Number(profileImage.width)  : undefined,
        height:   profileImage.height != null ? Number(profileImage.height) : undefined,
      };
    }

    // Cover image — same rule applies.
    if (coverImage !== undefined) {
      $set.coverImage = {
        url:      String(coverImage.url      || ""),
        publicId: String(coverImage.publicId || ""),
        width:    coverImage.width  != null ? Number(coverImage.width)  : undefined,
        height:   coverImage.height != null ? Number(coverImage.height) : undefined,
      };
    }

    if (Object.keys($set).length === 0)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    await db.collection("profiles").updateOne(
      { userId: new mongoose.Types.ObjectId(user.id) },
      { $set }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/profile]", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}