// app/api/admin/me/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import { requireAdminUserFromRequest } from "@/lib/session";
import { Admin }                       from "@/models/admin";
import { User }                        from "@/models/user";

export const dynamic = "force-dynamic";

/** Self-service — the currently signed-in admin's own account details. */
export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();

    const record = await Admin.findById(admin.adminId).lean();
    if (!record) return NextResponse.json({ error: "Admin record not found" }, { status: 404 });

    return NextResponse.json({
      id: admin.id,
      adminId: String(record._id),
      name: record.name,
      displayName: record.displayName,
      email: record.email,
      avatar: admin.avatar || "",
      role: record.role,
      department: record.department,
      isOnboarded: record.isOnboarded,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error("[admin/me] failed to load account:", error);
    return NextResponse.json({ error: "Failed to load account" }, { status: 500 });
  }
}

/** Updates the currently signed-in admin's own display name and/or avatar. */
export async function PATCH(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { displayName?: string; avatar?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const displayName = body.displayName?.trim();
  const avatar = body.avatar?.trim();

  if (displayName !== undefined && !displayName) {
    return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
  }
  if (displayName !== undefined && displayName.length > 60) {
    return NextResponse.json({ error: "Display name must be 60 characters or fewer" }, { status: 400 });
  }

  try {
    await connectDB();

    await Promise.all([
      displayName !== undefined
        ? Admin.updateOne({ _id: admin.adminId }, { $set: { displayName } })
        : Promise.resolve(),
      avatar !== undefined
        ? User.updateOne({ _id: admin.id }, { $set: { avatar } })
        : Promise.resolve(),
    ]);

    return NextResponse.json({ displayName: displayName ?? admin.displayName, avatar: avatar ?? admin.avatar });
  } catch (error) {
    console.error("[admin/me] failed to update account:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}
