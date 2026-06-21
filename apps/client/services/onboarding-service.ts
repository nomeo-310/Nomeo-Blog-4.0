"use server";

import { headers } from "next/headers";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { Profile } from "@/models/profile";
import { createNotification } from "@/lib/create-notification";
import { isDuplicateKeyError } from "@/lib/username";
import { getAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connect-to-database";

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
 * Notifications on completion:
 *   - Everyone gets a friendly "you're all set" completion notification
 *     (system_announcement), sent via createNotification so the real-time bell
 *     updates instantly.
 *   - Writers ALSO get the creator_upgrade_successful notification.
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
  username?: string;
  displayName?: string;
  pronouns?: string;
  gender?: Gender;
  dateOfBirth?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  interests?: string[];
  creatorTopics?: string[];
  profileImage?: CloudinaryImageInput;
  coverImage?: CloudinaryImageInput;
}

export interface OnboardingResult {
  success: true;
  role: "user" | "creator";
}

/** Returns the Better Auth user collection (matches the mongodbAdapter). */
function userCollection() {
  return mongoose.connection.db!.collection("user");
}

export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<OnboardingResult> {
  await connectDB();
  const auth = await getAuth();

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

  if (input.dateOfBirth) {
    const dob = new Date(input.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      throw new Error("INVALID_DATE_OF_BIRTH");
    }
    if (ageFromDate(dob) < 13) {
      throw new Error("UNDER_MINIMUM_AGE");
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

    await createNotification({
      recipientId: userId,
      type: "creator_upgrade_successful",
      message:
        "You're now a creator on Nomeo! You can publish posts, build a following, and earn from the subscription pool. Write your first post to get started.",
    });
  } else {
    // Reader completion — a friendly "you're all set" note (real-time bell).
    await createNotification({
      recipientId: userId,
      type: "system_announcement",
      message:
        "You're all set! Start following writers, save posts you love, and join the conversation in the lounges.",
    });
  }

  return { success: true, role: isWriter ? "creator" : "user" };
}

/**
 * Standalone role upgrade — for readers who later decide to become creators.
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

  if (session.user.role === "creator") {
    return { success: true, role: "creator", alreadyCreator: true };
  }

  if (["moderator", "admin", "super_admin"].includes(session.user.role as string)) {
    throw new Error("ADMIN_CANNOT_BECOME_CREATOR");
  }

  const userId = session.user.id;
  const now = new Date();

  await Profile.updateOne(
    { userId },
    { $set: { creatorStatus: "active", becameCreatorAt: now } }
  );

  await userCollection().updateOne(
    { _id: new ObjectId(userId) },
    { $set: { role: "creator", updatedAt: now } }
  );

  await createNotification({
    recipientId: userId,
    type: "creator_upgrade_successful",
    message:
      "You're now a creator on Nomeo! You can publish posts, build a following, and earn from the subscription pool.",
  });

  return { success: true, role: "creator", alreadyCreator: false };
}

function ageFromDate(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}