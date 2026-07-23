// app/api/admin/lounges/[loungeId]/members/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

interface MemberRow {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: string;
  role: string;
  isSilenced: boolean;
  notificationsMuted: boolean;
  requestedAt: Date;
  respondedAt?: Date;
  lastMessageAt?: Date;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ loungeId: string }> }
) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { loungeId } = await params;
  if (!mongoose.Types.ObjectId.isValid(loungeId)) {
    return NextResponse.json({ error: "Invalid lounge id" }, { status: 400 });
  }

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const searchParams = new URL(req.url).searchParams;

    const status = searchParams.get("status") ?? "all";
    const page   = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));

    const match: Record<string, unknown> = { loungeId: new mongoose.Types.ObjectId(loungeId) };
    if (status !== "all") match.status = status;

    const [lounge, facetResult] = await Promise.all([
      db.collection("lounges").findOne({ _id: new mongoose.Types.ObjectId(loungeId) }, { projection: { bannedMembers: 1 } }),
      db.collection("lounge_members").aggregate([
        { $match: match },
        {
          $facet: {
            data: [
              { $sort: { requestedAt: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  userId: 1, status: 1, role: 1, isSilenced: 1, notificationsMuted: 1,
                  requestedAt: 1, respondedAt: 1, lastMessageAt: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ]).toArray(),
    ]);

    if (!lounge) return NextResponse.json({ error: "Lounge not found" }, { status: 404 });

    const rows = (facetResult[0]?.data ?? []) as MemberRow[];
    const total = facetResult[0]?.totalCount?.[0]?.count ?? 0;
    const bannedIds = new Set((lounge.bannedMembers as mongoose.Types.ObjectId[]).map((id) => String(id)));

    const userIds = rows.map((r) => r.userId);
    const users = userIds.length
      ? await db.collection("user").find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const userById = new Map(users.map((u) => [String(u._id), { name: u.name as string, email: u.email as string }]));

    const members = rows.map((r) => ({
      id:     String(r._id),
      user:   { id: String(r.userId), ...(userById.get(String(r.userId)) ?? { name: "Unknown", email: "" }) },
      status: r.status,
      role:   r.role,
      isBanned: bannedIds.has(String(r.userId)),
      isSilenced: r.isSilenced,
      notificationsMuted: r.notificationsMuted,
      requestedAt: r.requestedAt,
      respondedAt: r.respondedAt,
      lastMessageAt: r.lastMessageAt,
    }));

    return NextResponse.json({
      loungeId,
      filters: { status },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      members,
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId/members] failed to list members:", error);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}
