import { betterAuth, APIError } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { Profile } from "@/models/profile";
import { Setting } from "@/models/setting";
import { createNotification } from "@/lib/create-notification";
import { connectDB } from "./connect-to-database";
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
 *   3. Notification — a welcome message (system_announcement), via
 *      createNotification for a single consistent notification path.
 *
 * Note: the welcome notification fires during the create hook, before the user
 * has a live client connected, so its real-time bump is a no-op in practice —
 * the message is picked up on first load. We use createNotification anyway so
 * every notification in the app goes through one helper.
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
      });
      created = true;
    } catch (err) {
      if (isDuplicateKeyError(err, "userId")) return;
      if (isDuplicateKeyError(err, "username")) continue;
      throw err;
    }
  }

  if (!created) {
    throw new Error("Failed to allocate a unique username after multiple attempts");
  }

  // ── Setting (idempotent) ───────────────────────────────────────────────
  await Setting.updateOne(
    { userId: user.id },
    { $setOnInsert: { userId: user.id } },
    { upsert: true }
  );

  // ── Welcome notification (one consistent path via createNotification) ──
  await createNotification({
    recipientId: user.id,
    type: "system_announcement",
    message: `Welcome to Nomeo, ${user.name ?? "there"}! Complete your profile to start reading, following writers, and joining the conversation.`,
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
          input: false,
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

              if (!profile) return { data: session };

              if (profile.banStatus === "banned") {
                throw new APIError("FORBIDDEN", { message: "account_banned" });
              }

              return { data: session };
            } catch (err) {
              if (err instanceof APIError) throw err;
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