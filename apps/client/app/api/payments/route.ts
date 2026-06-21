// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Payment, PaymentGatewayStatus } from "@/models/payment";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/connect-to-database";

/**
 * GET /api/payments
 * -----------------
 * The current user's own subscription payment history, paginated and newest
 * first. Scoped to the caller — users only ever see their own payments.
 *
 * Query params:
 *   ?status=success|failed|pending|abandoned|reversed   (optional filter)
 *   ?page=1&limit=20                                     (pagination)
 *
 * Joins the plan name/interval so each row is renderable without extra fetches.
 */

const VALID_STATUSES = Object.values(PaymentGatewayStatus);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    await connectDB();

    // Always scoped to the caller — never trust a client-supplied user id.
    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(user.id),
    };
    if (status && VALID_STATUSES.includes(status as PaymentGatewayStatus)) {
      query.gatewayStatus = status;
    }

    const [docs, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("planId", "name interval")
        .lean(),
      Payment.countDocuments(query),
    ]);

    const payments = docs.map((p: Record<string, any>) => {
      const plan = p.planId && typeof p.planId === "object" ? p.planId : null;
      return {
        id: String(p._id),
        reference: p.reference,
        status: p.gatewayStatus,
        amount: p.amount,
        amountPaid: p.amountPaid,
        amountFormatted: `₦${((p.amountPaid ?? p.amount ?? 0) / 100).toLocaleString("en-NG")}`,
        currency: p.currency,
        channel: p.channel ?? null,
        cardLast4: p.cardLast4 ?? null,
        cardType: p.cardType ?? null,
        paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        plan: plan ? { id: String(plan._id), name: plan.name, interval: plan.interval } : null,
      };
    });

    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/payments]", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message ?? "Failed to fetch payments" },
      { status: 500 }
    );
  }
}