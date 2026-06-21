import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { Plan, type IPlan } from "@/models/plan";
import { connectDB } from "@/lib/connect-to-database";

/**
 * GET /api/plans/[id]
 * -------------------
 * Public. Returns one active plan by its id, for the checkout/confirmation
 * step. The membership page lists plans via GET /api/plans, then the chosen
 * plan's id is used here to confirm price + Paystack plan code before payment.
 *
 * Returns 404 if the plan doesn't exist or isn't active. Returns the
 * externalPriceId (Paystack plan code) the payment initiate step needs.
 */

const MONTHS_PER_INTERVAL: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannually: 6,
  yearly: 12,
};

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid plan id" }, { status: 400 });
    }

    await connectDB();

    const plan = await Plan.findOne({ _id: id, status: "active" }).lean<IPlan | null>();
    if (!plan) {
      return NextResponse.json({ success: false, message: "Plan not found" }, { status: 404 });
    }

    const months = MONTHS_PER_INTERVAL[plan.interval] ?? 1;
    const perMonth = Math.round(plan.priceAmount / months);

    return NextResponse.json({
      success: true,
      plan: {
        id: String(plan._id),
        name: plan.name,
        description: plan.description ?? "",
        interval: plan.interval,
        months,
        priceAmount: plan.priceAmount,
        priceFormatted: formatNaira(plan.priceAmount),
        perMonthAmount: perMonth,
        perMonthFormatted: formatNaira(perMonth),
        currency: plan.currency,
        trialDays: plan.trialDays,
        features: (plan.features ?? []).map((f) => ({ label: f.label, isHighlighted: f.isHighlighted })),
        isHighlighted: plan.isHighlighted,
        isDefault: plan.isDefault,
        /** Paystack plan code — only needed for Paystack-managed recurring plans. */
        externalPriceId: plan.externalPriceId ?? null,
        isPurchasable: plan.priceAmount > 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/plans/[id]]", error);
    return NextResponse.json({ success: false, message: "Failed to load plan" }, { status: 500 });
  }
}