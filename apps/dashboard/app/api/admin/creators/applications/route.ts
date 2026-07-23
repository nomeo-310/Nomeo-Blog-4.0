// app/api/admin/creators/applications/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest } from "@/lib/session";
import { CreatorApplication, type CreatorApplicationStatus } from "@/models/creator-application";

export const dynamic = "force-dynamic";

const STATUSES: CreatorApplicationStatus[] = ["pending", "approved", "rejected"];

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const statusParam = params.get("status") ?? "pending";
    const status = STATUSES.includes(statusParam as CreatorApplicationStatus) ? statusParam : "pending";
    const page  = Math.max(1, Number(params.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = status === "all" ? {} : { status };

    const [applications, total] = await Promise.all([
      CreatorApplication.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CreatorApplication.countDocuments(match),
    ]);

    const peopleIds = [
      ...applications.map((a) => a.userId),
      ...applications.filter((a) => a.reviewedBy).map((a) => a.reviewedBy!),
    ];
    const people = peopleIds.length
      ? await db.collection("user").find({ _id: { $in: peopleIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const personById = new Map(people.map((p) => [String(p._id), { name: p.name as string, email: p.email as string }]));
    const personOrUnknown = (id: mongoose.Types.ObjectId) => personById.get(String(id)) ?? { name: "Unknown", email: "" };

    return NextResponse.json({
      filters: { status },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      applications: applications.map((a) => ({
        id: String(a._id),
        applicant: { id: String(a.userId), ...personOrUnknown(a.userId) },
        writingTopics: a.writingTopics,
        motivation: a.motivation,
        portfolioLinks: a.portfolioLinks,
        sampleContent: a.sampleContent,
        status: a.status,
        reviewedBy: a.reviewedBy ? { id: String(a.reviewedBy), ...personOrUnknown(a.reviewedBy) } : null,
        reviewNote: a.reviewNote,
        reviewedAt: a.reviewedAt,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/creators/applications] failed to list applications:", error);
    return NextResponse.json({ error: "Failed to load applications" }, { status: 500 });
  }
}
