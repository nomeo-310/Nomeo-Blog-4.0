import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { connectDB } from "@/lib/connect-to-database";
import { getAuth } from "@/lib/auth";

/**
 * GET /api/auth/check-status
 * --------------------------
 * Called by middleware (Edge can't touch mongoose, so it delegates here).
 * Resolves the current session and returns the signed-in user's
 * Profile.banStatus so middleware can block banned accounts.
 *
 * Returns:
 *   200 { banStatus }   — when a valid session + profile exist
 *   401                 — no valid session
 *   404                 — session but no profile (treat as sign-out upstream)
 */
export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuth();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const profile = await mongoose.connection
      .db!.collection("profiles")
      .findOne(
        { userId: new ObjectId(session.user.id) },
        { projection: { banStatus: 1, _id: 0 } }
      );

    if (!profile) {
      return Response.json({ error: "Profile not found" }, { status: 404 });
    }

    return Response.json({ banStatus: profile.banStatus ?? "active" });
  } catch (error) {
    console.error("[GET /api/auth/check-status]", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}