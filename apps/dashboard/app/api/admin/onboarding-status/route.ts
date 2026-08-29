// app/api/admin/onboarding-status/route.ts
import { NextResponse } from "next/server";
import { getAuth }      from "@/lib/auth";
import { connectDB }    from "@/lib/connect-to-database";
import mongoose         from "mongoose";
import { Admin }        from "@/models/admin";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["super_admin", "admin", "support"];

/**
 * Whether the signed-in admin still needs to complete first-login setup.
 * Deliberately does NOT go through requireAdminUserFromRequest (which
 * requires isActive === true) or rely on the Better Auth session-merge hook
 * in lib/auth.ts (which has proven unreliable for this) — it does its own
 * direct, correctly-typed lookup so the dashboard can trust this value.
 */
export async function GET(req: Request) {
  try {
    await connectDB();

    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = mongoose.connection.db!;
    const user = await db.collection("user").findOne({ _id: new mongoose.Types.ObjectId(session.user.id) });
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await Admin.findOne({ userId: user._id }).lean();
    if (!admin) return NextResponse.json({ error: "Admin record not found" }, { status: 404 });

    return NextResponse.json({
      isOnboarded: !!admin.isOnboarded,
      isActive: !!admin.isActive,
      displayName: admin.displayName || admin.name,
    });
  } catch (error) {
    console.error("[admin/onboarding-status] failed:", error);
    return NextResponse.json({ error: "Failed to load onboarding status" }, { status: 500 });
  }
}
