// app/api/creator-application/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/connect-to-database";
import { CreatorApplication } from "@/models/creator-application";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/creator-application
 * Returns the current user's latest application status (if any).
 * { status: "pending" | "approved" | "rejected" | null, reviewNote?: string }
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ status: null });

    await connectDB();

    const app = await CreatorApplication.findOne(
      { userId: user.id },
      { status: 1, reviewNote: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .lean() as any;

    if (!app) return NextResponse.json({ status: null });

    return NextResponse.json({
      status:     app.status,
      reviewNote: app.reviewNote ?? null,
      submittedAt: app.createdAt,
    });
  } catch (err) {
    console.error("[GET /api/creator-application]", err);
    return NextResponse.json({ status: null }, { status: 500 });
  }
}

/**
 * POST /api/creator-application
 * Submits a new creator application for the signed-in user.
 * Only users with role === "user" can apply; creators already have access.
 * Body: { motivation, writingTopics?, portfolioLinks?, sampleContent? }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role === "creator") {
      return NextResponse.json({ error: "You are already a creator.", code: "ALREADY_CREATOR" }, { status: 409 });
    }

    if (user.role !== "user") {
      return NextResponse.json({ error: "Only regular users can apply." }, { status: 403 });
    }

    await connectDB();

    // Check for an existing pending application
    const existing = await CreatorApplication.findOne({ userId: user.id, status: "pending" }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending application.", code: "ALREADY_PENDING" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { motivation, writingTopics, portfolioLinks, sampleContent } = body;

    if (!motivation?.trim()) {
      return NextResponse.json({ error: "Please tell us why you want to become a creator." }, { status: 400 });
    }
    if (motivation.trim().length < 30) {
      return NextResponse.json({ error: "Please write at least 30 characters for your motivation." }, { status: 400 });
    }

    await CreatorApplication.create({
      userId:         user.id,
      motivation:     motivation.trim(),
      writingTopics:  writingTopics?.trim()    ?? "",
      portfolioLinks: portfolioLinks?.trim()   ?? "",
      sampleContent:  sampleContent?.trim()    ?? "",
      status:         "pending",
    });

    return NextResponse.json({ success: true, status: "pending" }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/creator-application]", err);
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "You already have a pending application.", code: "ALREADY_PENDING" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to submit application." }, { status: 500 });
  }
}