import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit01Icon, FavouriteIcon, Bookmark01Icon } from "@hugeicons/core-free-icons";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { ProfileBanner } from "./profile-banner";
import { ProfileBio } from "./profile-bio";
import { ProfileAbout } from "./profile-about";
import { ProfileLoungeCard } from "./profile-lounge-card";
import { PostsSection } from "./profile-posts-section";
import { ProfileReaderNotice } from "./profile-reader-notice";
import type { ProfileData, ProfilePost, ProfileLounge } from "./profile-types";

/**
 * ProfilePage — public creator/reader profile.
 *
 * Post visibility rules:
 *   Creator  → published posts shown to everyone (their writing is public)
 *   Reader   → no posts grid shown to public visitors
 *              isSelf → shows liked + saved posts (private activity, self only)
 *
 * Layout is composed from sibling sub-components in this same folder
 * (profile-banner, profile-bio, profile-about, profile-lounge-card,
 * profile-posts-section, profile-reader-notice); this file owns the data
 * layer (below) and the top-level composition only.
 *
 * Component: app-pages/profile/profile-page.tsx
 * Route:     app/(root)/profile/[username]/page.tsx
 */

/* ── Metadata ───────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: "Profile not found — Nomeo" };
  return {
    title: `${profile.displayName} (@${profile.username}) — Nomeo`,
    description: profile.bio || `Read ${profile.displayName}'s writing on Nomeo.`,
    openGraph: {
      title: `${profile.displayName} on Nomeo`,
      description: profile.bio,
      images: profile.avatar ? [profile.avatar] : [],
    },
  };
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function ProfilePage({ username, viewer }: {
  username: string;
  viewer: Awaited<ReturnType<typeof getCurrentUser>>;
}) {
  const profile = await getProfile(username);
  if (!profile) notFound();

  const isSelf = viewer?.id === profile.userId;

  // Parallel fetch — only what's needed
  const [posts, likedPosts, savedPosts, lounge] = await Promise.all([
    // Creator posts — shown to everyone
    profile.isCreator ? getProfilePosts(profile.userId) : Promise.resolve([]),
    // Liked + saved — fetched for self regardless of role
    isSelf ? getLikedPosts(profile.userId) : Promise.resolve([]),
    isSelf ? getSavedPosts(profile.userId) : Promise.resolve([]),
    // Lounge — creators only
    profile.isCreator ? getProfileLounge(profile.userId) : Promise.resolve(null),
  ]);

  return (
    <div className="w-full bg-background pb-24">
      <ProfileBanner profile={profile} isSelf={isSelf} viewer={viewer} />

      <div className="w-full px-4 sm:px-0">
        <ProfileBio profile={profile} />
        <ProfileAbout about={profile.about} />
        <ProfileLoungeCard lounge={lounge} />

        {/* ══ POSTS SECTION ═══════════════════════════════════════════
            • Each section fetches 5, shows 4, 5th triggers "View more"
            • Creator (public):  posts only — "View more" → /
            • Creator (self):    posts + liked + saved — "View more" → dashboard
            • Reader  (self):    liked + saved only — "View more" → dashboard
            • Reader  (public):  privacy placeholder
        ══════════════════════════════════════════════════════════════ */}

        {/* ── Creator posts — visible to everyone ─────────────────── */}
        {profile.isCreator && (
          <PostsSection
            title="Writing"
            icon={<HugeiconsIcon icon={Edit01Icon} className="h-5 w-5" />}
            posts={posts}
            totalCount={profile.postsCount}
            viewMoreHref={isSelf ? "/dashboard/posts" : "/"}
            viewMoreLabel={isSelf ? "View all posts" : "Explore more writing"}
            emptyIcon={<HugeiconsIcon icon={Edit01Icon} className="mx-auto h-9 w-9 text-muted-foreground/30" />}
            emptyTitle="No posts yet"
            emptyDesc={isSelf ? "Your published posts will appear here." : `${profile.displayName} hasn't published yet.`}
          />
        )}

        {/* ── Self-view activity (creator + reader) ───────────────── */}
        {isSelf && (
          <div className="space-y-10 mt-10">
            <PostsSection
              title="Posts you liked"
              icon={<HugeiconsIcon icon={FavouriteIcon} className="h-5 w-5 text-rose-500" />}
              posts={likedPosts}
              viewMoreHref="/dashboard/liked"
              viewMoreLabel="View all liked posts"
              emptyIcon={<HugeiconsIcon icon={FavouriteIcon} className="mx-auto h-8 w-8 text-muted-foreground/30" />}
              emptyTitle="No liked posts yet"
              emptyDesc="Posts you like will appear here."
              mt={false}
            />
            <PostsSection
              title="Saved posts"
              icon={<HugeiconsIcon icon={Bookmark01Icon} className="h-5 w-5 text-primary" />}
              posts={savedPosts}
              viewMoreHref="/dashboard/saved"
              viewMoreLabel="View all saved posts"
              emptyIcon={<HugeiconsIcon icon={Bookmark01Icon} className="mx-auto h-8 w-8 text-muted-foreground/30" />}
              emptyTitle="No saved posts yet"
              emptyDesc="Posts you save will appear here."
              mt={false}
            />
          </div>
        )}

        {/* ── Reader public-view placeholder ───────────────────────── */}
        {!profile.isCreator && !isSelf && <ProfileReaderNotice displayName={profile.displayName} />}
      </div>
    </div>
  );
}

/* ── Data layer ─────────────────────────────────────────────────────────── */

async function getProfile(username: string): Promise<ProfileData | null> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return null;

    const raw = await db.collection("profiles").findOne(
      { username },
      {
        projection: {
          userId: 1, username: 1, displayName: 1, pronouns: 1,
          bio: 1, about: 1, location: 1, occupation: 1,
          profileImage: 1, coverImage: 1, socialLinks: 1,
          postsCount: 1, followersCount: 1, followingCount: 1,
          creatorStatus: 1, createdAt: 1,
        },
      }
    );
    if (!raw) return null;

    const user = await db.collection("user").findOne(
      { _id: raw.userId},
      { projection: { role: 1 } }
    );

    return {
      userId:        String(raw.userId),
      username:      String(raw.username),
      displayName:   String(raw.displayName || raw.username || "Nomeo user"),
      pronouns:      String(raw.pronouns || ""),
      bio:           String(raw.bio || ""),
      about:         String(raw.about || ""),
      location:      String(raw.location || ""),
      occupation:    String(raw.occupation || ""),
      avatar:        String(raw.profileImage?.url || ""),
      coverImage:    String(raw.coverImage?.secureUrl || raw.coverImage?.url || ""),
      socialLinks: {
        twitter:   raw.socialLinks?.twitter   || undefined,
        linkedin:  raw.socialLinks?.linkedin  || undefined,
        github:    raw.socialLinks?.github    || undefined,
        website:   raw.socialLinks?.website   || undefined,
        instagram: raw.socialLinks?.instagram || undefined,
      },
      postsCount:    Number(raw.postsCount    || 0),
      followersCount:Number(raw.followersCount || 0),
      followingCount:Number(raw.followingCount || 0),
      isCreator:     user?.role === "creator",
      joinedAt:      raw.createdAt instanceof Date ? raw.createdAt.toISOString() : new Date().toISOString(),
    };
  } catch (err) {
    console.error("[ProfilePage] getProfile failed", err);
    return null;
  }
}

async function getProfilePosts(userId: string): Promise<ProfilePost[]> {
  try {
    const db = mongoose.connection.db;
    if (!db) return [];
    const raw = await db.collection("posts")
      .find(
        { authorId: new mongoose.Types.ObjectId(userId), status: "published", isRemoved: { $ne: true } },
        { projection: { title: 1, slug: 1, excerpt: 1, coverImage: 1, tags: 1, readingTime: 1, access: 1, viewsCount: 1, publishedAt: 1 } }
      )
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(5)
      .toArray();
    return raw.map(mapPost);
  } catch { return []; }
}

async function getLikedPosts(userId: string): Promise<ProfilePost[]> {
  try {
    const db = mongoose.connection.db;
    if (!db) return [];
    const reactions = await db.collection("reactions")
      .find({ userId: new mongoose.Types.ObjectId(userId), targetType: "post" }, { projection: { targetId: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    if (!reactions.length) return [];
    const postIds = reactions.map((r: any) => r.targetId);
    const raw = await db.collection("posts")
      .find({ _id: { $in: postIds }, status: "published", isRemoved: { $ne: true } },
        { projection: { title: 1, slug: 1, excerpt: 1, coverImage: 1, tags: 1, readingTime: 1, access: 1, viewsCount: 1, publishedAt: 1 } })
      .toArray();
    return raw.map(mapPost);
  } catch { return []; }
}

async function getSavedPosts(userId: string): Promise<ProfilePost[]> {
  try {
    const db = mongoose.connection.db;
    if (!db) return [];
    const saved = await db.collection("saved_posts")
      .find({ userId: new mongoose.Types.ObjectId(userId) }, { projection: { postId: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    if (!saved.length) return [];
    const postIds = saved.map((s: any) => s.postId);
    const raw = await db.collection("posts")
      .find({ _id: { $in: postIds }, status: "published", isRemoved: { $ne: true } },
        { projection: { title: 1, slug: 1, excerpt: 1, coverImage: 1, tags: 1, readingTime: 1, access: 1, viewsCount: 1, publishedAt: 1 } })
      .toArray();
    return raw.map(mapPost);
  } catch { return []; }
}

function mapPost(p: any): ProfilePost {
  return {
    id:          String(p._id),
    title:       String(p.title || "Untitled"),
    slug:        String(p.slug  || p._id),
    excerpt:     String(p.excerpt || ""),
    coverImage:  String(p.coverImage?.secureUrl || p.coverImage?.url || p.coverImage || ""),
    tags:        Array.isArray(p.tags) ? p.tags.map(String).filter(Boolean).slice(0, 2) : [],
    readingTime: typeof p.readingTime === "number" ? p.readingTime : null,
    access:      p.access === "paid" ? "paid" : "free",
    viewsCount:  Number(p.viewsCount || 0),
    publishedAt: p.publishedAt instanceof Date ? p.publishedAt.toISOString() : null,
  };
}

async function getProfileLounge(userId: string): Promise<ProfileLounge> {
  try {
    const db = mongoose.connection.db;
    if (!db) return null;
    const raw = await db.collection("lounges").findOne(
      { creatorId: new mongoose.Types.ObjectId(userId), kind: "creator", status: "active", isSuspended: { $ne: true } },
      { projection: { name: 1, description: 1, membersCount: 1, messagesCount: 1, rules: 1 } }
    );
    if (!raw) return null;
    const lid = raw._id;
    const memberDocs = await db.collection("lounge_members")
      .find({ loungeId: lid, status: "accepted", userId: { $ne: new mongoose.Types.ObjectId(userId) } }, { projection: { userId: 1 } })
      .sort({ createdAt: -1 }).limit(5).toArray();
    const memberUserIds = memberDocs.map((m: any) => m.userId);
    const memberProfiles = memberUserIds.length
      ? await db.collection("profiles")
          .find({ userId: { $in: memberUserIds } }, { projection: { userId: 1, displayName: 1, username: 1, profileImage: 1 } })
          .toArray()
      : [];
    const profileMap = new Map(memberProfiles.map((p: any) => [String(p.userId), p]));
    const members = memberUserIds.map((uid: any) => {
      const p = profileMap.get(String(uid));
      return { id: String(uid), name: String(p?.displayName || p?.username || "Member"), avatar: String(p?.profileImage?.url || "") };
    });
    return {
      id: String(raw._id), name: String(raw.name || ""), description: String(raw.description || ""),
      membersCount: Number(raw.membersCount || 0), messagesCount: Number(raw.messagesCount || 0),
      rules: Array.isArray(raw.rules) ? raw.rules.map(String) : [], members,
    };
  } catch { return null; }
}
