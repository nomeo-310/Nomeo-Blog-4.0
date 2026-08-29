// app/api/admin/subscribers/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import { requireAdminUserFromRequest } from "@/lib/session";
import { NewsletterSubscriber }        from "@/models/newsletter";
import { escapeRegExp }                from "@/lib/utils";

export const dynamic = "force-dynamic";

const SOURCES = ["landing_form", "footer_form", "onboarding", "import"] as const;

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;

    const statusParam = params.get("status") ?? "all";
    const search       = params.get("search")?.trim();
    const sourceParam  = params.get("source") ?? "all";
    const source       = (SOURCES as readonly string[]).includes(sourceParam) ? sourceParam : "all";
    const page         = Math.max(1, Number(params.get("page")) || 1);
    const limit        = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (statusParam === "confirmed") { match.isConfirmed = true; match.isUnsubscribed = false; }
    else if (statusParam === "unconfirmed") { match.isConfirmed = false; match.isUnsubscribed = false; }
    else if (statusParam === "unsubscribed") { match.isUnsubscribed = true; }
    if (source !== "all") match.source = source;
    if (search) {
      match.$or = [
        { email: { $regex: escapeRegExp(search), $options: "i" } },
        { name:  { $regex: escapeRegExp(search), $options: "i" } },
      ];
    }

    const [subscribers, total] = await Promise.all([
      NewsletterSubscriber.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NewsletterSubscriber.countDocuments(match),
    ]);

    return NextResponse.json({
      filters: { status: statusParam, source, search },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      subscribers: subscribers.map((s) => ({
        id: String(s._id),
        email: s.email,
        name: s.name ?? null,
        phone: s.phone ?? null,
        userId: s.userId ? String(s.userId) : null,
        isConfirmed: s.isConfirmed,
        confirmedAt: s.confirmedAt ?? null,
        isUnsubscribed: s.isUnsubscribed,
        unsubscribedAt: s.unsubscribedAt ?? null,
        source: s.source,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/subscribers] failed to list subscribers:", error);
    return NextResponse.json({ error: "Failed to load subscribers" }, { status: 500 });
  }
}
