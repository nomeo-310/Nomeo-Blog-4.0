// app/api/admin/admins/invites/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { AdminInvite }                 from "@/models/admin-invite";

export const dynamic = "force-dynamic";

/**
 * Read-only history of every admin brought onto the team — who added them,
 * when, and with what note. Admin accounts are provisioned immediately (see
 * POST /api/admin/admins), so every record here is already "accepted"; this
 * exists purely as a detailed, permanent log distinct from the generic
 * AdminLog audit trail.
 */
export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const page  = Math.max(1, Number(params.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const [invites, total] = await Promise.all([
      AdminInvite.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminInvite.countDocuments({}),
    ]);

    const peopleIds = [
      ...invites.map((i) => i.invitedBy),
      ...invites.filter((i) => i.acceptedByUserId).map((i) => i.acceptedByUserId!),
    ];
    const people = peopleIds.length
      ? await db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    return NextResponse.json({
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      invites: invites.map((i) => ({
        id: String(i._id),
        invitedBy: { id: String(i.invitedBy), ...personOrUnknown(i.invitedBy) },
        email: i.email,
        role: i.role,
        department: i.department,
        personalMessage: i.personalMessage,
        status: i.status,
        acceptedAt: i.acceptedAt,
        acceptedBy: i.acceptedByUserId ? { id: String(i.acceptedByUserId), ...personOrUnknown(i.acceptedByUserId) } : null,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/admins/invites] failed to list admin creation history:", error);
    return NextResponse.json({ error: "Failed to load admin creation history" }, { status: 500 });
  }
}
