// lib/session.ts  (admin dashboard)
import { getAuth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/connect-to-database";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { IAdminPermissions } from "@/models/admin";

/**
 * Admin Dashboard — Session
 * --------------------------
 * Uses Better Auth for authentication (same instance as the main webapp,
 * same BETTER_AUTH_SECRET, same MongoDB database).
 *
 * On top of the Better Auth session we join the Admin document so every
 * session carries the full admin context: role, permissions, department,
 * login stats etc. — in a single aggregation round-trip.
 *
 * Two variants:
 *   getCurrentUser()              → Server Components, Layouts, Server Actions
 *   getCurrentUserFromRequest()   → Route Handlers (pass request.headers directly)
 *
 * Guards:
 *   requireAdminUser()            → any admin role, redirects to /login
 *   requireAdminFromRequest()     → Route Handler variant, returns null
 */

const ADMIN_ROLES = ["super_admin", "admin", "support"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

// ── Core session ──────────────────────────────────────────────────────────

export async function getSession() {
  const auth    = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// ── Shared aggregation ────────────────────────────────────────────────────

/**
 * One MongoDB aggregation that joins:
 *   user → account (for providerId)
 *         → admins  (for role, permissions, stats, etc.)
 *
 * Returns null if the user has no Admin document or the Admin is not active.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  await connectDB();
  const db = mongoose.connection.db!;
  const userId = new ObjectId(session.user.id); // plain string — Better Auth uses nanoid, never ObjectId

  // Single aggregation joining user → account → admin in one round-trip
  const [result] = await db
    .collection("user")
    .aggregate([
      {
        // _id is a plain string in Better Auth's MongoDB collections
        $match: { _id: userId },
      },
      {
        // Join the cblueential account to get providerId
        $lookup: {
          from: "account",
          localField: "_id",
          foreignField: "userId",
          as: "accounts",
        },
      },
      {
        // Join our custom Admin collection for display name, login stats etc.
        $lookup: {
          from: "admins",
          localField: "_id",
          foreignField: "userId",
          as: "adminRecords",
        },
      },
      { $limit: 1 },
    ])
    .toArray();

  if (!result) return null;

  const account = result.accounts?.[0] ?? null;
  const admin = result.adminRecords?.[0] ?? null;

  // Only return an admin session if the Admin record exists and is active.
  // Regular users who somehow have a session won't have an admin record.
  const isAdmin = !!admin;
  const isSupport = isAdmin && admin.role === 'support';
  const isSuperAdmin = isAdmin && admin.role === 'super_admin';
  const isAnAdmin = isAdmin && admin.role === 'admin';

  return {
    // ── Better Auth user fields ──────────────────────────────────────────
    id: userId.toString(),
    adminId: isAdmin ? (admin._id.toString()) : '',
    name: (result.name as string) ?? "",
    email: result.email as string,
    emailVerified: result.emailVerified as boolean,
    role: (result.role as string) ?? "user",
    avatar: (result.avatar as string) ?? "",
    image: (result.image as string) ?? "",
    createdAt: result.createdAt as Date,
    updatedAt: result.updatedAt as Date,

    // ── Account / auth provider ──────────────────────────────────────────
    providerId: (account?.providerId as string) ?? null,

    // ── Admin profile fields (null for non-admins) ───────────────────────
    isAdmin,
    isSupport,
    isSuperAdmin,
    isAnAdmin,
    permissions: isAdmin ? (admin.permissions as IAdminPermissions) : null,
    department: isAdmin ? (admin.department) : null,
    isActive: isAdmin ? (admin.isActive as boolean) : false,
    adminStatus: isAdmin ? (admin.adminStatus as 'active' | 'suspended' | 'inactive') : 'active',
    displayName: isAdmin ? (admin.displayName as string) : ((result.name as string) ?? ""),
    isOnboarded: isAdmin ? (admin.isOnboarded as boolean) : false,
    useSeedPhrase: isAdmin ? (admin.useSeedPhrase as boolean) : false,
    loginCount: isAdmin ? ((admin.loginCount as number) ?? 0) : 0,
    lastLoginAt: isAdmin ? ((admin.lastLoginAt as Date) ?? null) : null,
    lastLoginIP: isAdmin ? ((admin.lastLoginIP as string) ?? null) : null,
  };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// Role hierarchy reference:
//   support    → isSupport: true
//   admin      → isSupport: true, isAdmin: true
//   super_admin → isSupport: true, isAdmin: true, isSuperAdmin: true

// ── Server Component / Server Action variant ──────────────────────────────


export async function requireAdminUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/login");
  return user;
}

/**
 * Role hierarchy (lowest → highest):
 *   support → admin → super_admin
 *
 * Each require guard passes if the user's role is AT OR ABOVE that level.
 * e.g. requireFullAdmin() passes for admin and super_admin.
 */

export async function requireSupport(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isSupport) redirect("/login");
  return user;
}

export async function requireAnAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isAnAdmin) redirect("/login");
  return user;
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperAdmin) redirect("/login");
  return user;
}

// ── Route Handler variant ─────────────────────────────────────────────────

export async function getCurrentUserFromRequest(requestHeaders: Headers) {
  await connectDB();

  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const db = mongoose.connection.db!;
  const userId = new ObjectId(session.user.id);

  const [result] = await db
    .collection("user")
    .aggregate([
      { $match: { _id: userId } },
      {
        $lookup: {
          from: "account",
          localField: "_id",
          foreignField: "userId",
          as: "accounts",
        },
      },
      {
        $lookup: {
          from: "admins",
          localField: "_id",
          foreignField: "userId",
          as: "adminRecords",
        },
      },
      { $limit: 1 },
    ])
    .toArray();

  if (!result) return null;

  const account = result.accounts?.[0] ?? null;
  const admin = result.adminRecords?.[0] ?? null;
  const isAdmin = !!admin && admin.isActive === true;

  const isSupport = isAdmin && admin.role === 'support';
  const isSuperAdmin = isAdmin && admin.role === 'super_admin';
  const isAnAdmin = isAdmin && admin.role === 'admin';

  return {
    id: userId.toString(),
    adminId: isAdmin ? (admin._id.toString()) : '',
    name: (result.name as string) ?? "",
    email: result.email as string,
    emailVerified: result.emailVerified as boolean,
    role: (result.role as string) ?? "user",
    avatar: (result.avatar as string) ?? "",
    image: (result.image as string) ?? "",
    createdAt: result.createdAt as Date,
    updatedAt: result.updatedAt as Date,

    // ── Account / auth provider ──────────────────────────────────────────
    providerId: (account?.providerId as string) ?? null,

    // ── Admin profile fields (null for non-admins) ───────────────────────
    isAdmin,
    isSupport,
    isSuperAdmin,
    isAnAdmin,
    permissions: isAdmin ? (admin.permissions as IAdminPermissions) : null,
    department: isAdmin ? (admin.department) : null,
    isActive: isAdmin ? (admin.isActive as boolean) : false,
    adminStatus: isAdmin ? (admin.adminStatus as 'active' | 'suspended' | 'inactive') : 'active',
    displayName: isAdmin ? (admin.displayName as string) : ((result.name as string) ?? ""),
    isOnboarded: isAdmin ? (admin.isOnboarded as boolean) : false,
    useSeedPhrase: isAdmin ? (admin.useSeedPhrase as boolean) : false,
    loginCount: isAdmin ? ((admin.loginCount as number) ?? 0) : 0,
    lastLoginAt: isAdmin ? ((admin.lastLoginAt as Date) ?? null) : null,
    lastLoginIP: isAdmin ? ((admin.lastLoginIP as string) ?? null) : null,
  };
}

export async function requireAdminUserFromRequest( requestHeaders: Headers): Promise<CurrentUser | null> {
  const user = await getCurrentUserFromRequest(requestHeaders);
  if (!user || !user.isAdmin) return null;
  return user;
}

export async function requireSupportFromRequest(
  requestHeaders: Headers
): Promise<CurrentUser | null> {
  const user = await getCurrentUserFromRequest(requestHeaders);
  if (!user || !user.isSupport) return null;
  return user;
}

export async function requireAnAdminFromRequest(
  requestHeaders: Headers
): Promise<CurrentUser | null> {
  const user = await getCurrentUserFromRequest(requestHeaders);
  if (!user || !user.isAnAdmin) return null;
  return user;
}

export async function requireSuperAdminFromRequest(
  requestHeaders: Headers
): Promise<CurrentUser | null> {
  const user = await getCurrentUserFromRequest(requestHeaders);
  if (!user || !user.isSuperAdmin) return null;
  return user;
}

export type CurrentUserFromRequest = CurrentUser;