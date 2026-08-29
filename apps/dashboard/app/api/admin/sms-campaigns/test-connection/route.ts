// app/api/admin/sms-campaigns/test-connection/route.ts
import { NextResponse }                from "next/server";
import { requireAdminUserFromRequest } from "@/lib/session";
import { smsService }                  from "@/lib/sms-service";

export const dynamic = "force-dynamic";

/** Quick way to confirm SMS_API_KEY is set and valid, without sending a real campaign. */
export async function GET(req: Request) {
  const admin = await requireAdminUserFromRequest(req.headers).catch(() => null);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await smsService.checkBalance();
  if (!result.success) {
    return NextResponse.json({ connected: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ connected: true, balance: result.balance, currency: result.currency });
}
