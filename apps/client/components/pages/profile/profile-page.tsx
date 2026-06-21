import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import {
  MapPin, Briefcase, Globe, Clock, Eye, PenLine,
  Users, MessageCircle, Lock, Sparkles, CalendarDays,
  Heart, Bookmark,
} from "lucide-react";
import { CiTwitter as Twitter, CiInstagram as Instagram, CiLinkedin as Linkedin } from "react-icons/ci";
import { SiGithub as Github } from "react-icons/si";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { ProfileConnectButton } from "@/components/ui/profile-connect-button";

/**
 * ProfilePage — public creator/reader profile.
 *
 * Post visibility rules:
 *   Creator  → published posts shown to everyone (their writing is public)
 *   Reader   → no posts grid shown to public visitors
 *              isSelf → shows liked + saved posts (private activity, self only)
 *
 * Component: components/pages/profile/profile-page.tsx
 * Route:     app/profile/[username]/page.tsx
 */

/* ── Types ──────────────────────────────────────────────────────────────── */

type ProfileData = {
  userId: string;
  username: string;
  displayName: string;
  pronouns: string;
  bio: string;
  about: string;
  location: string;
  occupation: string;
  avatar: string;
  coverImage: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    instagram?: string;
  };
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isCreator: boolean;
  joinedAt: string;
};

type ProfilePost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  readingTime: number | null;
  access: "free" | "paid";
  viewsCount: number;
  publishedAt: string | null;
};

type LoungeMemberPreview = {
  id: string;
  name: string;
  avatar: string;
};

type ProfileLounge = {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  messagesCount: number;
  rules: string[];
  members: LoungeMemberPreview[];
} | null;

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

  const hasSocialLinks = Object.values(profile.socialLinks).some(Boolean);

  return (
    <div className="w-full bg-background pb-24">

      {/* ══ BANNER ══════════════════════════════════════════════════ */}
      <div className="relative h-72 w-full overflow-hidden sm:h-80 md:h-96 lg:h-[420px] xl:h-[500px] mt-10 rounded-2xl">
        {profile.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background">
            <div className="absolute left-1/4 top-1/4 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/3 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Top-right action */}
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          {isSelf ? (
            <Link href="/dashboard/settings"
              className="rounded-full border border-white/30 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-black/60">
              Edit profile
            </Link>
          ) : viewer ? (
            <div className="[&>button]:rounded-full [&>button]:backdrop-blur-md [&>button]:border [&>button]:border-white/30 [&>button]:bg-black/40 [&>button]:text-white [&>button]:hover:bg-black/60">
              <ProfileConnectButton targetUserId={profile.userId} targetIsCreator={profile.isCreator} />
            </div>
          ) : (
            <Link href="/sign-in"
              className="rounded-full border border-white/30 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-black/60">
              Follow
            </Link>
          )}
        </div>

        {/* Bottom-left identity */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 sm:pb-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end gap-4">
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt=""
                  className="h-20 w-20 shrink-0 rounded-full border-2 border-white/30 object-cover shadow-xl ring-2 ring-white/20 sm:h-24 sm:w-24 md:h-28 md:w-28" />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-primary/20 font-heading text-3xl font-bold text-white shadow-xl backdrop-blur sm:h-24 sm:w-24 md:h-28 md:w-28">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-2xl font-bold text-white drop-shadow sm:text-3xl md:text-4xl">
                    {profile.displayName}
                  </h1>
                  {profile.pronouns && <span className="text-sm text-white/70">{profile.pronouns}</span>}
                  {profile.isCreator && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                      <Sparkles className="h-3 w-3" /> Creator
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-white/60">@{profile.username}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="font-bold text-white">{formatCount(profile.followersCount)}</span>
                    <span className="text-white/60">followers</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-bold text-white">{formatCount(profile.followingCount)}</span>
                    <span className="text-white/60">following</span>
                  </span>
                  {profile.isCreator && profile.postsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="font-bold text-white">{formatCount(profile.postsCount)}</span>
                      <span className="text-white/60">{profile.postsCount === 1 ? "post" : "posts"}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ BODY ════════════════════════════════════════════════════ */}
      <div className="w-full px-4 sm:px-0">

        {/* Bio + meta strip */}
        <div className="mt-6 border-b border-border pb-6">
          {profile.bio && (
            <p className="max-w-2xl text-sm leading-relaxed text-foreground">{profile.bio}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {profile.occupation && (
              <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{profile.occupation}</span>
            )}
            {profile.location && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{profile.location}</span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />Joined {formatDate(profile.joinedAt)}
            </span>
          </div>

          {hasSocialLinks && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {profile.socialLinks.website  && <SocialLink href={profile.socialLinks.website} icon={<Globe className="h-3.5 w-3.5" />} label="Website" />}
              {profile.socialLinks.twitter  && <SocialLink href={`https://twitter.com/${profile.socialLinks.twitter}`} icon={<Twitter className="h-3.5 w-3.5" />} label="Twitter" />}
              {profile.socialLinks.linkedin && <SocialLink href={profile.socialLinks.linkedin} icon={<Linkedin className="h-3.5 w-3.5" />} label="LinkedIn" />}
              {profile.socialLinks.github   && <SocialLink href={`https://github.com/${profile.socialLinks.github}`} icon={<Github className="h-3.5 w-3.5" />} label="GitHub" />}
              {profile.socialLinks.instagram && <SocialLink href={`https://instagram.com/${profile.socialLinks.instagram}`} icon={<Instagram className="h-3.5 w-3.5" />} label="Instagram" />}
            </div>
          )}
        </div>

        {/* ── About section — shown when set, for both creators and readers ── */}
        {profile.about && (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-3 font-heading text-base font-bold text-foreground">About</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {profile.about}
            </p>
          </div>
        )}

        {/* ── Lounge card (creators only) ─────────────────────────────── */}
        {lounge && (
          <div className="mt-8">
            <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Members lounge</h2>
            <Link href={`/lounges/${lounge.id}`}
              className="group flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Lock className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-bold text-foreground group-hover:text-primary">{lounge.name}</p>
                {lounge.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{lounge.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{lounge.membersCount.toLocaleString()} members</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{lounge.messagesCount.toLocaleString()} messages</span>
                </div>
              </div>
              {lounge.members.length > 0 && (
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex -space-x-2">
                    {lounge.members.slice(0, 5).map((m) => (
                      m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={m.id} src={m.avatar} alt={m.name} title={m.name}
                          className="h-8 w-8 rounded-full border-2 border-card object-cover" />
                      ) : (
                        <span key={m.id} title={m.name}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary/10 text-[10px] font-bold text-primary">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                      )
                    ))}
                    {lounge.membersCount > 5 && (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
                        +{lounge.membersCount - 5}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <span className="shrink-0 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                Request to join
              </span>
            </Link>
          </div>
        )}

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
            icon={<PenLine className="h-5 w-5" />}
            posts={posts}
            totalCount={profile.postsCount}
            viewMoreHref={isSelf ? "/dashboard/posts" : "/"}
            viewMoreLabel={isSelf ? "View all posts" : "Explore more writing"}
            emptyIcon={<PenLine className="mx-auto h-9 w-9 text-muted-foreground/30" />}
            emptyTitle="No posts yet"
            emptyDesc={isSelf ? "Your published posts will appear here." : `${profile.displayName} hasn't published yet.`}
          />
        )}

        {/* ── Self-view activity (creator + reader) ───────────────── */}
        {isSelf && (
          <div className="space-y-10 mt-10">
            <PostsSection
              title="Posts you liked"
              icon={<Heart className="h-5 w-5 text-rose-500" />}
              posts={likedPosts}
              viewMoreHref="/dashboard/liked"
              viewMoreLabel="View all liked posts"
              emptyIcon={<Heart className="mx-auto h-8 w-8 text-muted-foreground/30" />}
              emptyTitle="No liked posts yet"
              emptyDesc="Posts you like will appear here."
              mt={false}
            />
            <PostsSection
              title="Saved posts"
              icon={<Bookmark className="h-5 w-5 text-primary" />}
              posts={savedPosts}
              viewMoreHref="/dashboard/saved"
              viewMoreLabel="View all saved posts"
              emptyIcon={<Bookmark className="mx-auto h-8 w-8 text-muted-foreground/30" />}
              emptyTitle="No saved posts yet"
              emptyDesc="Posts you save will appear here."
              mt={false}
            />
          </div>
        )}

        {/* ── Reader public-view placeholder ───────────────────────── */}
        {!profile.isCreator && !isSelf && (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <User className="mx-auto h-9 w-9 text-muted-foreground/30" />
            <p className="mt-3 text-sm font-medium text-foreground">{profile.displayName} is a reader</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reading activity is private. Connect to see more.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── PostsSection — reusable 4-cap grid with View more ─────────────────── */

function PostsSection({
  title, icon, posts, totalCount, viewMoreHref, viewMoreLabel,
  emptyIcon, emptyTitle, emptyDesc, mt = true,
}: {
  title: string;
  icon: React.ReactNode;
  posts: ProfilePost[];
  totalCount?: number;
  viewMoreHref: string;
  viewMoreLabel: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDesc: string;
  mt?: boolean;
}) {
  // We fetch 5 to detect hasMore — display only first 4
  const hasMore  = posts.length > 4;
  const visible  = posts.slice(0, 4);
  const count    = totalCount ?? posts.length;

  return (
    <div className={mt ? "mt-10" : undefined}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
          {icon}
          {title}
          {count > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({count})</span>
          )}
        </h2>
        {hasMore && (
          <Link
            href={viewMoreHref}
            className="text-xs font-semibold text-primary hover:underline shrink-0"
          >
            {viewMoreLabel} →
          </Link>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
          {emptyIcon}
          <p className="mt-3 text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyDesc}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map(post => <ProfilePostCard key={post.id} post={post} />)}
          </div>
          {hasMore && (
            <div className="mt-6 text-center">
              <Link
                href={viewMoreHref}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
              >
                {viewMoreLabel}
              </Link>
            </div>
          )}
        </>
      )}
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
    const members: LoungeMemberPreview[] = memberUserIds.map((uid: any) => {
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

/* ── UI components ──────────────────────────────────────────────────────── */

function ProfilePostCard({ post }: { post: ProfilePost }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <Link href={`/post/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <PenLine className="h-8 w-8 text-primary/30" />
          </div>
        )}
        {post.access === "paid" && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            <Lock className="h-3 w-3 text-primary" /> Members
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {post.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">#{tag}</span>
            ))}
          </div>
        )}
        <Link href={`/post/${post.slug}`}>
          <h3 className="line-clamp-2 font-heading text-base font-bold leading-tight text-card-foreground transition-colors group-hover:text-primary">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
          {post.readingTime && (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.readingTime} min</span>
          )}
          <span className="ml-auto inline-flex items-center gap-1"><Eye className="h-3 w-3" />{formatCount(post.viewsCount)}</span>
        </div>
      </div>
    </article>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
      {icon}{label}
    </a>
  );
}

// placeholder icon for reader public view
function User({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ── Utils ──────────────────────────────────────────────────────────────── */

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(date));
}

function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}