// app/api/profile/me/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/me
 * --------------------
 * Returns the authenticated user's own profile data.
 * Used by the new-post page (follower count for publish modal)
 * and anywhere else the client needs the current user's profile.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const profile = await db.collection("profiles").findOne(
      { userId: new mongoose.Types.ObjectId(user.id) },
      {
        projection: {
          username: 1, displayName: 1, bio: 1, about: 1,
          location: 1, occupation: 1, pronouns: 1,
          profileImage: 1, coverImage: 1, socialLinks: 1,
          postsCount: 1, followersCount: 1, followingCount: 1,
          creatorStatus: 1,
        },
      }
    );

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    return NextResponse.json({
      userId:        user.id,
      username:      String(profile.username || ""),
      displayName:   String(profile.displayName || user.name || ""),
      bio:           String(profile.bio || ""),
      about:         String(profile.about || ""),
      location:      String(profile.location || ""),
      occupation:    String(profile.occupation || ""),
      pronouns:      String(profile.pronouns || ""),
      avatar:        String(profile.profileImage?.url || ""),
      avatarPublicId:String(profile.profileImage?.publicId || ""),
      // Auth provider — used to conditionally show password change
      providerId:    user.providerId ?? "credential",
      isOAuth:       user.isOAuth ?? false,
      role:          user.role ?? "user",
      coverImage:    profile.coverImage?.secureUrl || profile.coverImage?.url
        ? { secureUrl: profile.coverImage.secureUrl || profile.coverImage.url, publicId: profile.coverImage.publicId || "" }
        : null,
      socialLinks:   profile.socialLinks ?? {},
      postsCount:    Number(profile.postsCount    || 0),
      followersCount:Number(profile.followersCount || 0),
      followingCount:Number(profile.followingCount || 0),
    });
  } catch (err) {
    console.error("[GET /api/profile/me]", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}