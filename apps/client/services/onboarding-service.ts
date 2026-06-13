"use server";

import { headers } from "next/headers";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { Profile } from "@/models/profile";
import { Notification } from "@/models/notification";
import { isDuplicateKeyError } from "@/lib/username";
import { getAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connect-to database";

/**
 * Onboarding Service
 * ------------------
 * Role choice happens at onboarding, not the signup form (Option B).
 *
 * Flow:
 *   1. User signs up → role is always "user" (auth.ts forces this).
 *   2. During onboarding they pick "reader" or "writer", set their handle,
 *      profile details, interests, and (optionally) profile/cover images.
 *   3. completeOnboarding() saves those choices and — if they chose "writer" —
 *      upgrades User.role to "creator" and activates the creator profile.
 *
 * Why update the user document directly:
 *   Better Auth has no reliable server API for mutating custom additionalFields
 *   like `role`, and `role` is `input: false` so the client can never set it.
 *   We update the Better Auth user collection through the shared mongoose
 *   connection — the same collection the mongodbAdapter uses.
 *
 * Ordering & safety:
 *   - Profile.updateOne runs FIRST. It carries the schema validation
 *     (username uniqueness, enum checks). If it fails, we throw before
 *     touching the role — so the user is never left half-upgraded.
 *   - Only after the profile succeeds do we flip the role.
 *   - The role can only ever become "creator". Admin roles
 *     (moderator/admin/super_admin) are impossible to self-assign.
 *   - The session is verified server-side; a user can only onboard themselves.
 *
 * Images:
 *   - profileImage / coverImage are stored as OBJECTS on the Profile
 *     ({ url, publicId, ... }) so the publicId is available for delete/replace.
 *   - The profile image URL is ALSO mirrored onto the Better Auth user as a
 *     plain STRING (user.avatar + user.image) for quick reads and Better Auth
 *     compatibility.
 *
 * IMPORTANT — session refresh:
 *   The role changes in the DB immediately, but the user's existing session
 *   cookie still says "user" until it refreshes. After this returns, the
 *   client should do a full-page navigation (or re-fetch the session) so the
 *   new "creator" role propagates. Don't rely on the in-memory session being
 *   updated synchronously.
 */

export type SignupIntent = "reader" | "writer";
export type Gender = "male" | "female" | "non_binary" | "prefer_not_to_say";

export interface CloudinaryImageInput {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export interface CompleteOnboardingInput {
  intent: SignupIntent;
  /** Optional: let the user choose their own handle during onboarding */
  username?: string;
  /** Name shown on posts and profile — distinct from the @handle */
  displayName?: string;
  pronouns?: string;
  gender?: Gender;
  /** ISO date string from the form, e.g. "1998-04-12" */
  dateOfBirth?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  /** Reader interests — Topic slugs chosen from the curated picker */
  interests?: string[];
  /** Creator's declared topics — Topic slugs (only used when intent is "writer") */
  creatorTopics?: string[];
  /** Uploaded profile picture (Cloudinary). Stored as object on Profile; URL mirrored to user.avatar/image. */
  profileImage?: CloudinaryImageInput;
  /** Uploaded cover image (Cloudinary) — writers. Stored as object on Profile. */
  coverImage?: CloudinaryImageInput;
}

export interface OnboardingResult {
  success: true;
  role: "user" | "creator";
}

/** Returns the Better Auth user collection (matches the mongodbAdapter). */
function userCollection() {
  // Better Auth's mongodbAdapter uses the singular "user" collection by default.
  return mongoose.connection.db!.collection("user");
}

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<OnboardingResult> {
  await connectDB();
  const auth = await getAuth();

  // Verify the caller is authenticated — they can only onboard themselves
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const userId = session.user.id;
  const now = new Date();
  const isWriter = input.intent === "writer";

  // ── Build the Profile update ──────────────────────────────────────────
  const profileUpdate: Record<string, unknown> = {
    onboardingCompleted: true,
    onboardingStep: 0,
  };

  if (input.username)    profileUpdate.username = input.username.toLowerCase().trim();
  if (input.displayName) profileUpdate.displayName = input.displayName.trim();
  if (input.pronouns)    profileUpdate.pronouns = input.pronouns.trim();
  if (input.gender)      profileUpdate.gender = input.gender;
  if (input.bio !== undefined)        profileUpdate.bio = input.bio;
  if (input.location !== undefined)   profileUpdate.location = input.location;
  if (input.occupation !== undefined) profileUpdate.occupation = input.occupation;
  if (input.interests)   profileUpdate.interests = input.interests;
  if (input.profileImage) profileUpdate.profileImage = input.profileImage;
  if (input.coverImage)   profileUpdate.coverImage = input.coverImage;

  // Date of birth — validate the 13+ age requirement before saving
  if (input.dateOfBirth) {
    const dob = new Date(input.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      throw new Error("INVALID_DATE_OF_BIRTH");
    }
    if (ageFromDate(dob) < 13) {
      throw new Error("UNDER_MINIMUM_AGE"); // platform requires 13+
    }
    profileUpdate.dateOfBirth = dob;
  }

  if (isWriter) {
    profileUpdate.creatorStatus = "active";
    profileUpdate.becameCreatorAt = now;
    if (input.creatorTopics) profileUpdate.creatorTopics = input.creatorTopics;
  }

  // ── 1. Profile FIRST (it carries validation + username uniqueness) ─────
  try {
    await Profile.updateOne(
      { userId },
      { $set: profileUpdate },
      { runValidators: true }
    );
  } catch (err) {
    if (isDuplicateKeyError(err, "username")) {
      throw new Error("USERNAME_TAKEN");
    }
    throw err;
  }

  // ── 1b. Mirror the avatar URL onto the Better Auth user ────────────────
  // user.avatar / user.image are STRINGS (Better Auth shape). The Profile
  // keeps the full object (with publicId) for management; the user keeps the
  // plain URL for quick reads and Better Auth compatibility.
  if (input.profileImage?.url) {
    await userCollection().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { avatar: input.profileImage.url, image: input.profileImage.url, updatedAt: now } }
    );
  }

  // ── 2. Role upgrade ONLY after the profile succeeded ───────────────────
  if (isWriter) {
    await userCollection().updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: "creator", updatedAt: now } }
    );

    await Notification.create({
      recipientId: userId,
      type: "creator_upgrade_successful",
      message:
        "You're now a creator on Nomeo! You can publish posts, build a following, and earn from the subscription pool. Write your first post to get started.",
      isRead: false,
    });
  }

  return { success: true, role: isWriter ? "creator" : "user" };
}

/**
 * Standalone role upgrade — for readers who later decide to become creators
 * (the "Become a creator" button in account settings).
 *
 * Same security guarantees: only ever upgrades to "creator", session-verified,
 * and admin roles are blocked from this path.
 */
export async function upgradeToCreator(): Promise<{
  success: true;
  role: "creator";
  alreadyCreator: boolean;
}> {
  await connectDB();
  const auth = await getAuth();

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  // Already a creator? Nothing to do.
  if (session.user.role === "creator") {
    return { success: true, role: "creator", alreadyCreator: true };
  }

  // Admin roles must not pass through the creator path
  if (["moderator", "admin", "super_admin"].includes(session.user.role as string)) {
    throw new Error("ADMIN_CANNOT_BECOME_CREATOR");
  }

  const userId = session.user.id;
  const now = new Date();

  // Profile first, then role — same ordering guarantee as onboarding
  await Profile.updateOne(
    { userId },
    { $set: { creatorStatus: "active", becameCreatorAt: now } }
  );

  await userCollection().updateOne(
    { _id: new ObjectId(userId) },
    { $set: { role: "creator", updatedAt: now } }
  );

  await Notification.create({
    recipientId: userId,
    type: "creator_upgrade_successful",
    message:
      "You're now a creator on Nomeo! You can publish posts, build a following, and earn from the subscription pool.",
    isRead: false,
  });

  return { success: true, role: "creator", alreadyCreator: false };
}

/**
 * Compute age in whole years from a date of birth.
 * Enforces the platform's 13+ minimum age requirement.
 */
function ageFromDate(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}