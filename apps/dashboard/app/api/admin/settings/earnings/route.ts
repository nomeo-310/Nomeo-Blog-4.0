// app/api/admin/settings/earnings/route.ts
import { NextResponse }                from "next/server";
import { connectDB }                   from "@/lib/connect-to-database";
import mongoose                        from "mongoose";
import { requireAdminUserFromRequest, type CurrentUser } from "@/lib/session";
import { logAdminAction }              from "@/lib/admin-action-log";
import { AdminAction }                 from "@/models/admin-log";
import { getPlatformSettings, type PayoutModel } from "@/models/platform-settings";
import type { IAdminPermissions }      from "@/models/admin";

export const dynamic = "force-dynamic";

const PAYOUT_MODELS: PayoutModel[] = ["fixed_rate", "pool_share"];

function hasPermission(admin: CurrentUser, flag: keyof IAdminPermissions): boolean {
  return admin.isSuperAdmin || !!admin.permissions?.[flag];
}

function serialize(settings: Awaited<ReturnType<typeof getPlatformSettings>>) {
  return {
    payoutModel:          settings.payoutModel,
    platformCutPercent:   settings.platformCutPercent,
    ratePerCompletedRead: settings.ratePerCompletedRead,
    completedReadWeight:  settings.completedReadWeight,
    minimumPayoutAmount:  settings.minimumPayoutAmount,
    currency:             settings.currency,
    updatedAt:            settings.updatedAt,
  };
}

export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const settings = await getPlatformSettings();
    return NextResponse.json({ settings: serialize(settings) });
  } catch (error) {
    console.error("[admin/settings/earnings] failed to load settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(admin, "canManagePlatformSettings")) {
    return NextResponse.json({ error: "You do not have permission to manage platform settings" }, { status: 403 });
  }

  let body: {
    payoutModel?: string;
    platformCutPercent?: number;
    ratePerCompletedRead?: number;
    completedReadWeight?: number;
    minimumPayoutAmount?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { payoutModel, platformCutPercent, ratePerCompletedRead, completedReadWeight, minimumPayoutAmount } = body;

  if (payoutModel !== undefined && !PAYOUT_MODELS.includes(payoutModel as PayoutModel)) {
    return NextResponse.json({ error: "payoutModel must be one of fixed_rate, pool_share" }, { status: 400 });
  }
  if (platformCutPercent !== undefined && (typeof platformCutPercent !== "number" || platformCutPercent < 0 || platformCutPercent > 100)) {
    return NextResponse.json({ error: "platformCutPercent must be a number between 0 and 100" }, { status: 400 });
  }
  if (ratePerCompletedRead !== undefined && (typeof ratePerCompletedRead !== "number" || ratePerCompletedRead < 0)) {
    return NextResponse.json({ error: "ratePerCompletedRead must be a non-negative number" }, { status: 400 });
  }
  if (completedReadWeight !== undefined && (typeof completedReadWeight !== "number" || completedReadWeight < 1 || completedReadWeight > 5)) {
    return NextResponse.json({ error: "completedReadWeight must be a number between 1 and 5" }, { status: 400 });
  }
  if (minimumPayoutAmount !== undefined && (typeof minimumPayoutAmount !== "number" || minimumPayoutAmount < 0)) {
    return NextResponse.json({ error: "minimumPayoutAmount must be a non-negative number" }, { status: 400 });
  }

  try {
    await connectDB();
    const settings = await getPlatformSettings();

    const changes: { field: string; oldValue?: unknown; newValue?: unknown }[] = [];
    const applyIfChanged = <K extends keyof typeof settings>(field: K, value: (typeof settings)[K] | undefined) => {
      if (value !== undefined && value !== settings[field]) {
        changes.push({ field: String(field), oldValue: settings[field], newValue: value });
        settings[field] = value;
      }
    };

    applyIfChanged("payoutModel", payoutModel as PayoutModel | undefined);
    applyIfChanged("platformCutPercent", platformCutPercent);
    applyIfChanged("ratePerCompletedRead", ratePerCompletedRead);
    applyIfChanged("completedReadWeight", completedReadWeight);
    applyIfChanged("minimumPayoutAmount", minimumPayoutAmount);

    if (changes.length === 0) {
      return NextResponse.json({ settings: serialize(settings) });
    }

    settings.updatedBy = new mongoose.Types.ObjectId(admin.id);
    await settings.save();

    await logAdminAction(req, admin, {
      action: AdminAction.UPDATE_SETTINGS,
      details: `Updated earnings settings: ${changes.map((c) => c.field).join(", ")}`,
      targetType: "system",
      metadata: { changes },
    });

    return NextResponse.json({ settings: serialize(settings) });
  } catch (error) {
    console.error("[admin/settings/earnings] failed to update settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
