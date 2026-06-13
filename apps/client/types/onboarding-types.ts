/**
 * Onboarding types — shared between the server action and client components.
 *
 * These live in their own (non-"use server") file because a "use server"
 * module may export ONLY async functions. Types must be defined elsewhere and
 * imported into both the service and the UI.
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
  /** Uploaded profile picture (Cloudinary) */
  profileImage?: CloudinaryImageInput;
  /** Uploaded cover image (Cloudinary) — writers */
  coverImage?: CloudinaryImageInput;
}

export interface OnboardingResult {
  success: true;
  role: "user" | "creator";
}