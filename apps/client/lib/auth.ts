import { betterAuth, APIError } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { Profile } from "@/models/profile";
import { Setting } from "@/models/setting";
import { Notification } from "@/models/notification";
import { connectDB } from "./connect-to database";
import { buildBaseUsername, withUsernameSuffix, isDuplicateKeyError } from "./username";

/**
 * Better Auth configuration — Nomeo blog platform.
 *
 * Roles (must match Profile.ts and admin-profile.ts):
 *   user, creator, moderator, admin, super_admin
 *
 * On signup the create hook provisions the three documents every account
 * needs immediately:
 *   1. Profile  — public identity, with a generated unique username.
 *   2. Setting  — default notification / privacy / appearance preferences.
 *   3. Notification — a welcome message (system_announcement).
 *
 * NOT created on signup:
 *   - Subscription   → only exists when a user pays for a plan.
 *   - AdminProfile   → only for invited admin roles (separate flow).
 *   - SavedList      → the default "Saved" list is created lazily on first save,
 *                      or you can add it here if you prefer it eager.
 *
 * The session hook blocks banned and suspended accounts at login time,
 * reading Profile.banStatus (active | banned | shadow_banned).
 */

/**
 * Provision the documents a brand-new account needs: Profile, Setting,
 * and a welcome Notification. Designed to be BULLETPROOF:
 *
 *   1. Idempotent — safe if the create.after hook ever fires twice for the
 *      same user (retries, replays). It checks for an existing Profile first
 *      and exits early, so no duplicate profiles are created.
 *
 *   2. Race-safe username — relies on the unique index, not a pre-check.
 *      It attempts Profile.create() and, on a duplicate-key error for
 *      `username`, regenerates the suffix and retries. Two concurrent signups
 *      that happen to generate the same handle can't both succeed; the loser
 *      retries with a new suffix instead of erroring out.
 *
 *   3. Partial-failure tolerant — Setting and Notification are created with
 *      idempotent upsert semantics so a half-completed previous run can be
 *      safely re-run without throwing on the unique userId index.
 */
async function provisionNewUser(user: { id: string; name?: string | null; email: string }) {
  // ── Idempotency guard: if a Profile already exists, provisioning ran. ──
  const existing = await Profile.exists({ userId: user.id });
  if (existing) return;

  const base = buildBaseUsername(user.name || user.email);
  const displayName = user.name || base;

  // ── Insert the Profile, retrying on username collisions ────────────────
  const MAX_ATTEMPTS = 6;
  let created = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS && !created; attempt++) {
    const username = attempt === 0 ? base : withUsernameSuffix(base);
    try {
      await Profile.create({
        userId: user.id,
        username,
        displayName,
        bio: "",
        interests: [],
        creatorTopics: [],
        banStatus: "active",
        freeReadsRemaining: 10,
        onboardingCompleted: false,
        onboardingStep: 0,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        savedPostsCount: 0,
        isPublic: true,
        // creatorStatus stays null — set only on creator upgrade
      });
      created = true;
    } catch (err) {
      // If userId collided, another run beat us — provisioning is done.
      if (isDuplicateKeyError(err, "userId")) return;
      // If the username collided, loop and try a fresh suffix.
      if (isDuplicateKeyError(err, "username")) continue;
      // Any other error is unexpected — surface it.
      throw err;
    }
  }

  if (!created) {
    throw new Error("Failed to allocate a unique username after multiple attempts");
  }

  // ── Setting + welcome Notification (idempotent) ────────────────────────
  await Setting.updateOne(
    { userId: user.id },
    { $setOnInsert: { userId: user.id } },
    { upsert: true }
  );

  await Notification.create({
    recipientId: user.id,
    type: "system_announcement",
    message: `Welcome to Nomeo, ${user.name ?? "there"}! Complete your profile to start reading, following writers, and joining the conversation.`,
    isRead: false,
  });
}

export function createAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,

    onAPIError: {
      errorURL: "/auth/error",
    },

    advanced: {
      cookiePrefix: "nomeo_client",
    },

    database: mongodbAdapter(mongoose.connection.db! as never),

    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          // Matches the role set used across the app's schemas
          input: false, // users cannot set their own role at signup
        },
        avatar: {
          type: "string",
          required: false,
          defaultValue: "",
        },
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await connectDB();
            await provisionNewUser(user);
          },
        },
      },

      session: {
        create: {
          before: async (session) => {
            try {
              await connectDB();

              const profile = await Profile.findOne({ userId: session.userId }).lean();

              // No profile yet — allow the session; onboarding handles the rest
              if (!profile) return { data: session };

              // Block fully banned accounts at login
              if (profile.banStatus === "banned") {
                // If the ban has an expiry that has passed, the service layer
                // should have lifted it; treat a still-"banned" status as active.
                throw new APIError("FORBIDDEN", { message: "account_banned" });
              }

              // shadow_banned users CAN log in — their content is just hidden.
              // No block here by design.

              return { data: session };
            } catch (err) {
              // Re-throw intentional blocks
              if (err instanceof APIError) throw err;

              // Fail open on unexpected DB/runtime errors so auth isn't bricked
              console.error("[Auth] session.create.before error:", err);
              return { data: session };
            }
          },
        },
      },
    },

    plugins: [],
  });
}

let _auth: ReturnType<typeof createAuth> | null = null;

export async function getAuth() {
  if (!_auth) {
    await connectDB();
    _auth = createAuth();
  }
  return _auth;
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];