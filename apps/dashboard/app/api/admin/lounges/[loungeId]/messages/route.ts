// app/api/admin/lounges/[loungeId]/messages/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

interface MessageRow {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  replyToId: mongoose.Types.ObjectId | null;
  body: string;
  deliveryStatus: string;
  isEdited: boolean;
  isRemoved: boolean;
  isDeletedByAuthor: boolean;
  isSystemMessage: boolean;
  reactions?: Record<string, number>;
  pendingReportsCount: number;
  createdAt: Date;
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

    const hasOpenReports = searchParams.get("hasOpenReports") === "true";
    const page  = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));

    const match: Record<string, unknown> = { loungeId: new mongoose.Types.ObjectId(loungeId) };
    if (hasOpenReports) match.pendingReportsCount = { $gt: 0 };

    const [facetResult] = await db
      .collection("lounge_messages")
      .aggregate([
        { $match: match },
        {
          $facet: {
            data: [
              { $sort: { createdAt: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  authorId: 1, replyToId: 1, body: 1, deliveryStatus: 1,
                  isEdited: 1, isRemoved: 1, isDeletedByAuthor: 1, isSystemMessage: 1,
                  reactions: 1, pendingReportsCount: 1, createdAt: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as MessageRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const authorIds = [...new Set(rows.map((r) => String(r.authorId)))].map((id) => new mongoose.Types.ObjectId(id));
    const authors = authorIds.length
      ? await db.collection("user").find({ _id: { $in: authorIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const authorById = new Map(authors.map((a) => [String(a._id), { name: a.name as string, email: a.email as string }]));

    const messages = rows.map((r) => ({
      id:      String(r._id),
      author:  { id: String(r.authorId), ...(authorById.get(String(r.authorId)) ?? { name: "Unknown", email: "" }) },
      replyToId: r.replyToId ? String(r.replyToId) : null,
      body: r.body,
      deliveryStatus: r.deliveryStatus,
      isEdited: r.isEdited,
      isRemoved: r.isRemoved,
      isDeletedByAuthor: r.isDeletedByAuthor,
      isSystemMessage: r.isSystemMessage,
      reactions: r.reactions ?? {},
      pendingReportsCount: r.pendingReportsCount,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      loungeId,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      messages,
    });
  } catch (error) {
    console.error("[admin/lounges/:loungeId/messages] failed to list messages:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}
