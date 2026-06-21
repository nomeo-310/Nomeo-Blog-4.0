// app/api/series/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { PostSeries } from "@/models/post";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/series
 * ---------------
 * Returns the authenticated creator's post series list.
 * Used to populate the series selector on the new/edit post page.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const series = await PostSeries
      .find({ creatorId: new mongoose.Types.ObjectId(user.id) })
      .select("title description postsCount")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      series: series.map((s: any) => ({
        id:          String(s._id),
        title:       String(s.title),
        description: String(s.description || ""),
        postsCount:  Number(s.postsCount || 0),
      })),
    });
  } catch (err) {
    console.error("[GET /api/series]", err);
    return NextResponse.json({ error: "Failed to load series" }, { status: 500 });
  }
}

/**
 * POST /api/series
 * ----------------
 * Creates a new post series. Creator-only.
 * Accepts: title, description
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "creator")
      return NextResponse.json({ error: "Only creators can create series" }, { status: 403 });

    await connectDB();

    const { title, description } = await req.json();
    if (!title?.trim())
      return NextResponse.json({ error: "Series title is required" }, { status: 400 });

    const series = await PostSeries.create({
      creatorId:   new mongoose.Types.ObjectId(user.id),
      title:       title.trim(),
      description: description?.trim() || "",
      isPublished: false,
      postIds:     [],
      postsCount:  0,
    });

    return NextResponse.json({
      id:    String(series._id),
      title: series.title,
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/series]", err);
    return NextResponse.json({ error: "Failed to create series" }, { status: 500 });
  }
}