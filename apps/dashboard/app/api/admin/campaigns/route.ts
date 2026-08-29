// app/api/admin/campaigns/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { Campaign, CampaignStatus, CampaignType } from "@/models/campaign";
import { escapeRegExp }                from "@/lib/utils";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

const STATUSES = Object.values(CampaignStatus);
const TYPES = Object.values(CampaignType);

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const db = mongoose.connection.db!;
    const params = new URL(req.url).searchParams;

    const statusParam = params.get("status") ?? "all";
    const status      = (STATUSES as string[]).includes(statusParam) ? statusParam : "all";
    const typeParam   = params.get("type") ?? "all";
    const type        = (TYPES as string[]).includes(typeParam) ? typeParam : "all";
    const search      = params.get("search")?.trim();
    const page        = Math.max(1, Number(params.get("page")) || 1);
    const limit       = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (status !== "all") match.status = status;
    if (type !== "all") match.type = type;
    if (search) {
      match.$or = [
        { title: { $regex: escapeRegExp(search), $options: "i" } },
        { subject: { $regex: escapeRegExp(search), $options: "i" } },
      ];
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Campaign.countDocuments(match),
    ]);

    const creatorIds = [...new Set(campaigns.map((c) => String(c.createdBy)))].map((id) => new mongoose.Types.ObjectId(id));
    const creators = creatorIds.length
      ? await db.collection("user").find({ _id: { $in: creatorIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const creatorById = new Map(creators.map((c) => [String(c._id), { name: c.name as string, email: c.email as string }]));

    return NextResponse.json({
      filters: { status, type, search },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      campaigns: campaigns.map((c) => ({
        id: String(c._id),
        title: c.title,
        subject: c.subject,
        type: c.type,
        status: c.status,
        recipients: c.recipients,
        hasExternalRecipients: c.hasExternalRecipients,
        createdBy: { id: String(c.createdBy), ...(creatorById.get(String(c.createdBy)) ?? { name: "Unknown", email: "" }) },
        scheduledFor: c.scheduledFor ?? null,
        sentAt: c.sentAt ?? null,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/campaigns] failed to list campaigns:", error);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canCreateCampaign")) {
    return NextResponse.json({ error: "You do not have permission to create a campaign" }, { status: 403 });
  }

  let body: {
    title?: string;
    subject?: string;
    content?: string;
    type?: CampaignType;
    filters?: { status?: string[]; subscribedAfter?: string };
    externalRecipients?: Array<{ email: string; name?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title   = body.title?.trim();
  const subject = body.subject?.trim();
  const content = body.content?.trim();
  if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "A subject is required" }, { status: 400 });
  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });
  if (!body.type || !TYPES.includes(body.type)) {
    return NextResponse.json({ error: `type must be one of ${TYPES.join(", ")}` }, { status: 400 });
  }

  const externalRecipients = (body.externalRecipients ?? []).filter((r) => /^\S+@\S+\.\S+$/.test(r.email));

  try {
    await connectDB();

    const campaign = await Campaign.create({
      title, subject, content, type: body.type,
      status: CampaignStatus.DRAFT,
      filters: body.filters
        ? {
            status: body.filters.status,
            subscribedAfter: body.filters.subscribedAfter ? new Date(body.filters.subscribedAfter) : undefined,
          }
        : undefined,
      externalRecipients,
      hasExternalRecipients: externalRecipients.length > 0,
      createdBy: new mongoose.Types.ObjectId(admin.id),
    });

    await logAdminAction(req, admin, {
      action: AdminAction.CREATE_CAMPAIGN,
      details: `created ${body.type} campaign "${campaign.title}"`,
      targetType: "campaign",
      targetId: String(campaign._id),
      targetName: campaign.title,
      reversible: true,
    });

    return NextResponse.json({ id: String(campaign._id), title: campaign.title, status: campaign.status }, { status: 201 });
  } catch (error) {
    console.error("[admin/campaigns] failed to create campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
