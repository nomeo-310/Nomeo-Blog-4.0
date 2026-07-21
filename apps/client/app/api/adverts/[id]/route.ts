import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { Advert } from "@/models/advert";
import { serializeAdvertFull } from "@/services/advert-services";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["admin", "super_admin"];
const STAFF_STATUSES = ["approved", "rejected", "paused", "active", "scheduled", "completed"];

/**
 * GET /api/adverts/[id]
 * Owner or staff only — full record including metrics/review state.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

    await connectDB();
    const advert = await Advert.findById(id).lean();
    if (!advert) return NextResponse.json({ success: false, message: "Advert not found" }, { status: 404 });

    const isStaff = STAFF_ROLES.includes(user.role);
    if (!isStaff && String(advert.createdBy) !== user.id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, advert: serializeAdvertFull(advert) });
  } catch (err) {
    console.error("[GET /api/adverts/[id]]", err);
    return NextResponse.json({ success: false, message: "Failed to load advert" }, { status: 500 });
  }
}

/**
 * PATCH /api/adverts/[id]
 * --------------------------
 * Two very different capabilities live here, gated separately:
 *
 *   Staff (admin/super_admin): the review workflow — approve/reject a
 *   pending advert, pause/resume a live one, or edit priority. Sets
 *   reviewedBy/reviewedAt automatically.
 *
 *   Owner (non-staff): can only edit creative fields while status is
 *   "draft", can submit a draft for review (status → pending_review), and
 *   can pause/resume their own already-approved advert. Anything else
 *   (e.g. trying to self-approve) is rejected.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

    await connectDB();
    const advert = await Advert.findById(id);
    if (!advert) return NextResponse.json({ success: false, message: "Advert not found" }, { status: 404 });

    const isStaff = STAFF_ROLES.includes(user.role);
    const isOwner = String(advert.createdBy) === user.id;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    if (isStaff) {
      if (typeof body.priority === "number") advert.priority = body.priority;
      if (typeof body.weight === "number" && body.weight > 0) advert.weight = body.weight;
      if (body.status && STAFF_STATUSES.includes(body.status)) {
        advert.status = body.status;
        advert.reviewedBy = new mongoose.Types.ObjectId(user.id);
        advert.reviewedAt = new Date();
        if (typeof body.reviewNote === "string") advert.reviewNote = body.reviewNote.trim();
      }
    } else {
      if (advert.status === "draft") {
        if (typeof body.title === "string") advert.title = body.title.trim();
        if (body.body !== undefined) advert.body = body.body?.trim();
        if (body.image !== undefined) advert.image = body.image;
        if (body.ctaLabel !== undefined) advert.ctaLabel = body.ctaLabel?.trim();
        if (body.ctaUrl !== undefined) advert.ctaUrl = body.ctaUrl?.trim();
        if (body.targeting) {
          advert.targeting = {
            topics: Array.isArray(body.targeting.topics) ? body.targeting.topics : advert.targeting.topics,
            audience: ["all", "free_only", "subscribers_only"].includes(body.targeting.audience)
              ? body.targeting.audience
              : advert.targeting.audience,
            locations: Array.isArray(body.targeting.locations) ? body.targeting.locations : advert.targeting.locations,
          };
        }
        if (body.startAt !== undefined) advert.startAt = body.startAt ? new Date(body.startAt) : undefined;
        if (body.endAt !== undefined) advert.endAt = body.endAt ? new Date(body.endAt) : undefined;

        if (body.status === "pending_review") {
          advert.status = "pending_review";
          advert.submittedAt = new Date();
        }
      } else if (["active", "scheduled"].includes(advert.status) && body.status === "paused") {
        advert.status = "paused";
      } else if (advert.status === "paused" && body.status === "active") {
        advert.status = advert.startAt && advert.startAt > new Date() ? "scheduled" : "active";
      } else if (advert.status === "rejected" && body.status === "draft") {
        // Revise a rejected advert — back to draft so the owner can edit and resubmit.
        advert.status = "draft";
      } else if (body.status) {
        return NextResponse.json({ success: false, message: "You can't change the status right now" }, { status: 409 });
      }
    }

    await advert.save();
    return NextResponse.json({ success: true, advert: serializeAdvertFull(advert) });
  } catch (err) {
    console.error("[PATCH /api/adverts/[id]]", err);
    return NextResponse.json({ success: false, message: "Failed to update advert" }, { status: 500 });
  }
}

/**
 * DELETE /api/adverts/[id]
 * Owners may delete their own draft or rejected advert; staff can delete any.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

    await connectDB();
    const advert = await Advert.findById(id).select("createdBy status");
    if (!advert) return NextResponse.json({ success: false, message: "Advert not found" }, { status: 404 });

    const isStaff = STAFF_ROLES.includes(user.role);
    const isOwner = String(advert.createdBy) === user.id;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    if (!isStaff && !["draft", "rejected"].includes(advert.status)) {
      return NextResponse.json({ success: false, message: "Only a draft or rejected advert can be deleted" }, { status: 409 });
    }

    await advert.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/adverts/[id]]", err);
    return NextResponse.json({ success: false, message: "Failed to delete advert" }, { status: 500 });
  }
}
