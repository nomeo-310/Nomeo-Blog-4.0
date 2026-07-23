// app/api/admin/lounges/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Lounge }                      from "@/models/lounge";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SORT_STAGES: Record<string, Record<string, 1 | -1>> = {
  newest:        { createdAt: -1 },
  oldest:        { createdAt: 1 },
  most_members:  { membersCount: -1 },
  most_messages: { messagesCount: -1 },
};

interface LoungeListRow {
  _id: mongoose.Types.ObjectId;
  creatorId?: mongoose.Types.ObjectId;
  kind: string;
  accessType: string;
  name: string;
  status: string;
  isSuspended: boolean;
  isMuted: boolean;
  membersCount: number;
  messagesCount: number;
  bannedMembersCount: number;
  createdAt: Date;
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const kind          = params.get("kind") ?? "all";
    const status        = params.get("status") ?? "all";
    const accessType    = params.get("accessType") ?? "all";
    const hasOpenReports = params.get("hasOpenReports") === "true";
    const search         = params.get("search")?.trim();
    const sortByParam    = params.get("sortBy") ?? "newest";
    const sortBy         = SORT_STAGES[sortByParam] ? sortByParam : "newest";
    const page           = Math.max(1, Number(params.get("page")) || 1);
    const limit          = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (kind === "creator" || kind === "platform") match.kind = kind;
    if (status !== "all") match.status = status;
    if (accessType === "subscribers" || accessType === "authenticated") match.accessType = accessType;
    if (search) match.name = { $regex: escapeRegExp(search), $options: "i" };

    if (hasOpenReports) {
      const loungeIdsWithReports = await db
        .collection("lounge_messages")
        .distinct("loungeId", { pendingReportsCount: { $gt: 0 } });
      match._id = { $in: loungeIdsWithReports };
    }

    const [facetResult] = await db
      .collection("lounges")
      .aggregate([
        { $match: match },
        {
          $facet: {
            data: [
              { $sort: { ...SORT_STAGES[sortBy], _id: -1 } },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  creatorId: 1, kind: 1, accessType: 1, name: 1, status: 1,
                  isSuspended: 1, isMuted: 1, membersCount: 1, messagesCount: 1,
                  bannedMembersCount: { $size: { $ifNull: ["$bannedMembers", []] } },
                  createdAt: 1,
                },
              },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const rows = (facetResult?.data ?? []) as LoungeListRow[];
    const total = facetResult?.totalCount?.[0]?.count ?? 0;

    const creatorIds = [...new Set(rows.filter((r) => r.creatorId).map((r) => String(r.creatorId)))]
      .map((id) => new mongoose.Types.ObjectId(id));
    const creators = creatorIds.length
      ? await db.collection("user").find({ _id: { $in: creatorIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const creatorById = new Map(creators.map((c) => [String(c._id), { name: c.name as string, email: c.email as string }]));

    // Reports live on individual messages, not the lounge itself — sum them per
    // lounge for just this page rather than a $lookup per document.
    const loungeIds = rows.map((r) => r._id);
    const reportCountRows = loungeIds.length
      ? await db.collection("lounge_messages")
          .aggregate([
            { $match: { loungeId: { $in: loungeIds }, pendingReportsCount: { $gt: 0 } } },
            { $group: { _id: "$loungeId", total: { $sum: "$pendingReportsCount" } } },
          ])
          .toArray()
      : [];
    const reportCountByLounge = new Map(
      (reportCountRows as { _id: mongoose.Types.ObjectId; total: number }[]).map((r) => [String(r._id), r.total])
    );

    const lounges = rows.map((r) => ({
      id:   String(r._id),
      name: r.name,
      kind: r.kind,
      accessType: r.accessType,
      status: r.status,
      isSuspended: r.isSuspended,
      isMuted: r.isMuted,
      creator: r.creatorId ? { id: String(r.creatorId), ...(creatorById.get(String(r.creatorId)) ?? { name: "Unknown", email: "" }) } : null,
      membersCount: r.membersCount,
      messagesCount: r.messagesCount,
      bannedMembersCount: r.bannedMembersCount,
      pendingReportsCount: reportCountByLounge.get(String(r._id)) ?? 0,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      filters: { kind, status, accessType, hasOpenReports, search },
      sortBy,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      lounges,
    });
  } catch (error) {
    console.error("[admin/lounges] failed to list lounges:", error);
    return NextResponse.json({ error: "Failed to load lounges" }, { status: 500 });
  }
}

/**
 * Creates a platform-owned lounge (kind "platform", no creatorId) — the open,
 * Nomeo-run community spaces (e.g. "The Commons", "Feedback & Ideas"). This is
 * the dashboard equivalent of the one-off seed script: creator lounges are
 * still only created by creators from the main app.
 *
 * accessType is always "authenticated" here — platform lounges have no creator
 * to hold a subscription against, so "subscribers" would be unsatisfiable.
 */
export async function POST(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    name?: string;
    description?: string;
    rules?: string[];
    slowModeSeconds?: number;
    maxMessageLength?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "A lounge name is required" }, { status: 400 });
  if (name.length > 100) return NextResponse.json({ error: "Lounge name must be 100 characters or fewer" }, { status: 400 });

  const description = body.description?.trim() || undefined;
  if (description && description.length > 500) {
    return NextResponse.json({ error: "Description must be 500 characters or fewer" }, { status: 400 });
  }

  const rules = (body.rules ?? []).map((r) => r.trim()).filter(Boolean);
  if (rules.length > 15) return NextResponse.json({ error: "A lounge can have at most 15 rules" }, { status: 400 });
  if (rules.some((r) => r.length > 200)) {
    return NextResponse.json({ error: "Each rule must be 200 characters or fewer" }, { status: 400 });
  }

  try {
    await connectDB();

    const existing = await Lounge.findOne({ name, kind: "platform" });
    if (existing) {
      return NextResponse.json({ error: "A platform lounge with this name already exists" }, { status: 409 });
    }

    const lounge = await Lounge.create({
      kind: "platform",
      accessType: "authenticated",
      name,
      description,
      rules,
      ...(body.slowModeSeconds !== undefined ? { slowModeSeconds: body.slowModeSeconds } : {}),
      ...(body.maxMessageLength !== undefined ? { maxMessageLength: body.maxMessageLength } : {}),
    });

    await logAdminAction(req, admin, {
      action: AdminAction.CREATE_LOUNGE,
      details: `created platform lounge "${lounge.name}"`,
      targetType: "lounge",
      targetId: String(lounge._id),
      targetName: lounge.name,
      reversible: true,
    });

    return NextResponse.json(
      {
        id: String(lounge._id),
        name: lounge.name,
        kind: lounge.kind,
        accessType: lounge.accessType,
        status: lounge.status,
        createdAt: lounge.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[admin/lounges] failed to create lounge:", error);
    return NextResponse.json({ error: "Failed to create lounge" }, { status: 500 });
  }
}
