// app/api/payments/stats/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";
import { PaymentService } from "@/services/payment-service";

/** GET /api/payments/stats — the current user's payment summary. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const stats = await PaymentService.getStats(user.id);

    return NextResponse.json({ success: true, ...stats }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/payments/stats]", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message ?? "Failed to fetch stats" },
      { status: 500 }
    );
  }
}