// app/api/admin/sms-campaigns/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { SmsCampaign, SmsCampaignStatus, SmsAudience } from "@/models/sms-campaign";
import { escapeRegExp }                from "@/lib/utils";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

const STATUSES = Object.values(SmsCampaignStatus);
const AUDIENCES = Object.values(SmsAudience);

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
    const search      = params.get("search")?.trim();
    const page        = Math.max(1, Number(params.get("page")) || 1);
    const limit       = Math.min(100, Math.max(1, Number(params.get("limit")) || 20));

    const match: Record<string, unknown> = {};
    if (status !== "all") match.status = status;
    if (search) match.title = { $regex: escapeRegExp(search), $options: "i" };

    const [campaigns, total] = await Promise.all([
      SmsCampaign.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SmsCampaign.countDocuments(match),
    ]);

    const creatorIds = [...new Set(campaigns.map((c) => String(c.createdBy)))].map((id) => new mongoose.Types.ObjectId(id));
    const creators = creatorIds.length
      ? await db.collection("user").find({ _id: { $in: creatorIds } }, { projection: { name: 1, email: 1 } }).toArray()
      : [];
    const creatorById = new Map(creators.map((c) => [String(c._id), { name: c.name as string, email: c.email as string }]));

    return NextResponse.json({
      filters: { status, search },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      campaigns: campaigns.map((c) => ({
        id: String(c._id),
        title: c.title,
        message: c.message,
        audience: c.audience,
        status: c.status,
        recipients: c.recipients,
        createdBy: { id: String(c.createdBy), ...(creatorById.get(String(c.createdBy)) ?? { name: "Unknown", email: "" }) },
        sentAt: c.sentAt ?? null,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("[admin/sms-campaigns] failed to list SMS campaigns:", error);
    return NextResponse.json({ error: "Failed to load SMS campaigns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canCreateCampaign")) {
    return NextResponse.json({ error: "You do not have permission to create an SMS campaign" }, { status: 403 });
  }

  let body: {
    title?: string;
    message?: string;
    audience?: SmsAudience;
    externalRecipients?: Array<{ phone: string; name?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title   = body.title?.trim();
  const message = body.message?.trim();
  if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "A message is required" }, { status: 400 });
  if (message.length > 918) return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  if (!body.audience || !AUDIENCES.includes(body.audience)) {
    return NextResponse.json({ error: `audience must be one of ${AUDIENCES.join(", ")}` }, { status: 400 });
  }

  const externalRecipients = (body.externalRecipients ?? []).filter((r) => r.phone?.trim());
  if ((body.audience === SmsAudience.EXTERNAL || body.audience === SmsAudience.BOTH) && externalRecipients.length === 0) {
    return NextResponse.json({ error: "externalRecipients is required for this audience" }, { status: 400 });
  }

  try {
    await connectDB();

    const campaign = await SmsCampaign.create({
      title, message, audience: body.audience,
      status: SmsCampaignStatus.DRAFT,
      externalRecipients,
      createdBy: new mongoose.Types.ObjectId(admin.id),
    });

    await logAdminAction(req, admin, {
      action: AdminAction.CREATE_SMS_CAMPAIGN,
      details: `created SMS campaign "${campaign.title}"`,
      targetType: "sms_campaign",
      targetId: String(campaign._id),
      targetName: campaign.title,
      reversible: true,
    });

    return NextResponse.json({ id: String(campaign._id), title: campaign.title, status: campaign.status }, { status: 201 });
  } catch (error) {
    console.error("[admin/sms-campaigns] failed to create SMS campaign:", error);
    return NextResponse.json({ error: "Failed to create SMS campaign" }, { status: 500 });
  }
}
