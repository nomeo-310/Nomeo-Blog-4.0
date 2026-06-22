// app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const DEFAULT_NOTIFICATIONS: Record<string, boolean> = {
  emailNewFollower:       true,
  emailFollowRequest:     true,
  emailNewComment:        true,
  emailCommentReply:      true,
  emailNewPost:           false,  // opt-in — can be noisy
  emailLoungeActivity:    true,
  emailSubscriptionAlerts:true,
  emailAccountAlerts:     true,   // always effectively on; shown for transparency
  pushNewFollower:        true,
  pushFollowRequest:      true,
  pushNewComment:         true,
  pushCommentReply:       true,
  pushNewPost:            false,
  pushLoungeMessage:      true,
  pushLoungeMention:      true,
};

/**
 * GET /api/settings
 * ------------------
 * Returns the current user's settings document.
 * Creates a default document if none exists.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const uid = new mongoose.Types.ObjectId(user.id);

    let settings = await db.collection("settings").findOne({ userId: uid });
    if (!settings) {
      // Create default settings document
      await db.collection("settings").insertOne({
        userId:        uid,
        notifications: {},
        privacy:       {},
        appearance:    {},
        creator:       {},
        createdAt:     new Date(),
        updatedAt:     new Date(),
      });
      settings = await db.collection("settings").findOne({ userId: uid });
    }

    return NextResponse.json({
      settings: {
        ...settings,
        // Merge defaults so new users see sensible pre-ticked toggles.
        // Stored values always win — this only fills in missing keys.
        notifications: {
          ...DEFAULT_NOTIFICATIONS,
          ...(settings?.notifications ?? {}),
        },
      },
    });
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 * --------------------
 * Updates the current user's settings.
 * Accepts any subset of notifications, privacy, appearance, creator prefs.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

    const body = await req.json();
    const { notifications, privacy, appearance, creator } = body;

    const $set: Record<string, any> = { updatedAt: new Date() };

    // Merge each sub-document field by field to avoid overwriting entire objects
    if (notifications) {
      for (const [k, v] of Object.entries(notifications)) {
        $set[`notifications.${k}`] = v;
      }
    }
    if (privacy) {
      for (const [k, v] of Object.entries(privacy)) {
        $set[`privacy.${k}`] = v;
      }
    }
    if (appearance) {
      for (const [k, v] of Object.entries(appearance)) {
        $set[`appearance.${k}`] = v;
      }
    }
    if (creator) {
      for (const [k, v] of Object.entries(creator)) {
        $set[`creator.${k}`] = v;
      }
    }

    const uid = new mongoose.Types.ObjectId(user.id);

    await db.collection("settings").updateOne(
      { userId: uid },
      { $set },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/settings]", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}