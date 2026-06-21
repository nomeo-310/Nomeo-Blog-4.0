import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { connectDB } from "./connect-to-database";

/**
 * Session & current-user helpers.
 *
 * Better Auth's session/user is intentionally minimal (id, name, email,
 * role, avatar). The app needs much more — username, display name,
 * onboarding state, creator status, ban status, free reads — all of which
 * live on the Profile. getCurrentUser() joins user + account + profile into
 * one shape the whole app can rely on.
 */

export async function getSession() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

/**
 * Full current-user object: identity (user) + auth provider (account) +
 * public/app detail (profile). Returns null when unauthenticated or when the
 * profile is missing (which shouldn't happen post-provisioning, but we guard).
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  await connectDB();
  const db = mongoose.connection.db!;
  const userId = new ObjectId(session.user.id);

  // Fetch user, account, and profile together
  const [user, account, profile] = await Promise.all([
    db.collection("user").findOne({ _id: userId }),
    db.collection("account").findOne({ userId }),
    db.collection("profiles").findOne({ userId }),
  ]);

  if (!user) return null;

  const role = (user.role as string) ?? "user";
  const isAdminRole = ["moderator", "admin", "super_admin"].includes(role);

  return {
    // ── Identity (Better Auth user) ──────────────────────────────────
    id: session.user.id,
    name: user.name as string,
    email: user.email as string,
    emailVerified: Boolean(user.emailVerified),
    role,
    createdAt: user.createdAt as Date,

    // ── Auth provider (account) ──────────────────────────────────────
    // "credential" for email/password, "google" for OAuth. Lets the UI hide
    // "change password" for Google users, etc.
    providerId: (account?.providerId as string) ?? "credential",
    isOAuth: account?.providerId === "google",

    // ── Profile (the app detail) ─────────────────────────────────────
    // Public handle + display name — what the navbar avatar menu and
    // profile links need.
    username: (profile?.username as string) ?? "",
    displayName: (profile?.displayName as string) ?? (user.name as string) ?? "",

    // Avatar: prefer the profile/user avatar, fall back to OAuth image.
    // Avatar: prefer the profile image object's URL, then the user's mirrored
    // avatar/image strings (kept in sync on upload), then OAuth image.
    avatar:
      (profile?.profileImage?.url as string) ??
      (user.avatar as string) ??
      (user.image as string) ??
      "",

    bio: (profile?.bio as string) ?? "",

    // ── Onboarding state ─────────────────────────────────────────────
    // The app gates new users into onboarding until this is true.
    onboardingCompleted: Boolean(profile?.onboardingCompleted),
    onboardingStep: (profile?.onboardingStep as number) ?? 0,

    // ── Roles & creator status ───────────────────────────────────────
    isCreator: role === "creator",
    isAdmin: isAdminRole,
    creatorStatus: (profile?.creatorStatus as string | null) ?? null,
    becameCreatorAt: (profile?.becameCreatorAt as Date | null) ?? null,

    // ── Account standing ─────────────────────────────────────────────
    banStatus: (profile?.banStatus as string) ?? "active",
    isBanned: profile?.banStatus === "banned",
    isShadowBanned: profile?.banStatus === "shadow_banned",

    // ── Reading / membership ─────────────────────────────────────────
    // Drives the paywall: how many paid posts a free user can still read.
    freeReadsRemaining: (profile?.freeReadsRemaining as number) ?? 0,

    // ── Interests / topics (Topic slugs) ─────────────────────────────
    interests: (profile?.interests as string[]) ?? [],
    creatorTopics: (profile?.creatorTopics as string[]) ?? [],

    // Counters for quick display without extra queries
    followersCount: (profile?.followersCount as number) ?? 0,
    followingCount: (profile?.followingCount as number) ?? 0,
    postsCount: (profile?.postsCount as number) ?? 0,
    savedPostsCount: (profile?.savedPostsCount as number) ?? 0,
  };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Convenience guards for common gating needs.
 */

/** Require a logged-in user; redirect home if not. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

/**
 * Whether the signed-in user still needs onboarding.
 * Returns false when not logged in (nothing to onboard).
 *
 * Use this in a server layout/page to drive the onboarding MODAL:
 *   const needsOnboarding = await needsOnboarding();
 *   <OnboardingGate needsOnboarding={needsOnboarding} />
 *
 * Onboarding is a modal, not a route — so we never redirect here.
 */
export async function needsOnboarding(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return !user.onboardingCompleted;
}

/** Require a creator; send non-creators home. (Onboarding stays a modal.) */
export async function requireCreator(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isCreator) redirect("/");
  return user;
}