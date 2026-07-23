// lib/auth/auth.ts
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { createAuthMiddleware } from "better-auth/api";
import mongoose from "mongoose";
import { connectDB } from "./connect-to-database";


export function createAuth() {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,

    // Derive trusted origins from env — no hardcoded ports
    trustedOrigins: [
      process.env.BETTER_AUTH_URL!,
      process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL!,
    ].filter(Boolean),

    database: mongodbAdapter(mongoose.connection.db!),

    advanced: {
      cookiePrefix: "nomeo_dashboard",
      // Ensure cookies are not scoped to a specific port
      // so localhost:3000 and localhost:3001 share the same cookie domain
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
    },

    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
        },
        avatar: {
          type: "string",
          required: false,
          defaultValue: "",
        },
      },
    },

    emailAndPassword: { enabled: true, requireEmailVerification: false },
    socialProviders: {},
    plugins: [],

    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/get-session") return;

        const session = (ctx.context as any)?.session;
        if (!session?.user) return;

        const adminRoles = ["super_admin", "admin", "moderator", "support"];
        if (!adminRoles.includes(session.user.role)) return;

        const db = mongoose.connection.db;
        if (!db) return;

        try {
          const admin = await db
            .collection("admins")
            .findOne({ userId: session.user.id });

          if (!admin || !admin.isActive) return;

          Object.assign(session.user, {
            displayName: (admin.displayName as string) ?? session.user.name,
            isOnboarded: (admin.isOnboarded as boolean) ?? false,
            useSeedPhrase: (admin.useSeedPhrase as boolean) ?? false,
            loginCount: (admin.loginCount as number) ?? 0,
            lastLoginAt: (admin.lastLoginAt as Date) ?? null,
            lastLoginIP: (admin.lastLoginIP as string) ?? null,
          });
        } catch (err) {
          console.error("Failed to merge admin fields into session:", err);
        }
      }),
    },
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

export type AdminSessionUser = Session["user"] & {
  displayName: string;
  isOnboarded: boolean;
  useSeedPhrase: boolean;
  loginCount: number;
  lastLoginAt: Date | null;
  lastLoginIP: string | null;
};