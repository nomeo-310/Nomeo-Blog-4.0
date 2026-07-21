import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sparkles } from "@hugeicons/core-free-icons";
import { ProfileConnectButton } from "@/components/ui/profile-connect-button";
import { GuestFollowButton } from "./guest-follow-button";
import { getCurrentUser } from "@/lib/session";
import { formatCount } from "./profile-format";
import type { ProfileData } from "./profile-types";

/** Cover image, avatar, identity, follow/edit action, and follower stats. */
export function ProfileBanner({
  profile, isSelf, viewer,
}: {
  profile: ProfileData;
  isSelf: boolean;
  viewer: Awaited<ReturnType<typeof getCurrentUser>>;
}) {
  return (
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
          <GuestFollowButton />
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
                    <HugeiconsIcon icon={Sparkles} className="h-3 w-3" /> Creator
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
  );
}
