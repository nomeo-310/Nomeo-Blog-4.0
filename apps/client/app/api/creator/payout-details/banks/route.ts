import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { paystack } from "@/lib/paystack";

export const dynamic = "force-dynamic";

/**
 * GET /api/creator/payout-details/banks
 * ---------------------------------------
 * The live list of Nigerian banks from Paystack, for the bank picker in
 * Settings → Payout. Fetched server-side so the bank code Paystack expects
 * always matches what the client shows — never hardcoded.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isCreator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const banks = await paystack.listBanks();
    return NextResponse.json({
      banks: banks
        .filter((b) => b.active)
        .map((b) => ({ name: b.name, code: b.code }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err) {
    console.error("[GET /api/creator/payout-details/banks]", err);
    return NextResponse.json({ error: "Failed to load bank list" }, { status: 502 });
  }
}
