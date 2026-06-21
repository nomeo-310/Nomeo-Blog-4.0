import { NextResponse } from "next/server";
import { Plan, type IPlan } from "@/models/plan";
import { connectDB } from "@/lib/connect-to-database";

/**
 * GET /api/plans
 * --------------
 * Public. Returns the active membership plans (the four billing intervals)
 * for the membership/pricing page. Sorted by sortOrder.
 *
 * Effective monthly price is computed server-side so the UI can show the
 * "₦x/mo" comparison without re-deriving interval maths everywhere.
 */

const MONTHS_PER_INTERVAL: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  biannually: 6,
  yearly: 12,
};

function serializePlan(p: IPlan) {
  const months = MONTHS_PER_INTERVAL[p.interval] ?? 1;
  const perMonth = Math.round(p.priceAmount / months);

  // Discount vs paying monthly (only meaningful for multi-month intervals).
  // Requires knowing the monthly plan's price; computed in the GET handler and
  // injected, so here we just expose the raw numbers.
  return {
    id: String(p._id),
    name: p.name,
    description: p.description ?? "",
    interval: p.interval,
    months,
    priceAmount: p.priceAmount, // kobo
    priceFormatted: formatNaira(p.priceAmount),
    perMonthAmount: perMonth,
    perMonthFormatted: formatNaira(perMonth),
    currency: p.currency,
    trialDays: p.trialDays,
    features: (p.features ?? []).map((f) => ({ label: f.label, isHighlighted: f.isHighlighted })),
    isHighlighted: p.isHighlighted,
    isDefault: p.isDefault,
    sortOrder: p.sortOrder,
    /** Sellable when it's an active priced plan. (externalPriceId is only
     *  needed for Paystack-managed recurring plans; one-off charges work
     *  without it.) */
    isPurchasable: p.priceAmount > 0,
  };
}

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

export async function GET() {
  try {
    await connectDB();

    const plans = await Plan.find({ status: "active" })
      .sort({ sortOrder: 1 })
      .lean<IPlan[]>();

    const serialized = plans.map(serializePlan);

    // Compute savings vs the monthly plan, if one exists.
    const monthly = serialized.find((p) => p.interval === "monthly");
    const withSavings = serialized.map((p) => {
      if (!monthly || p.interval === "monthly") return { ...p, savingsPercent: 0 };
      const fullPrice = monthly.priceAmount * p.months;
      const savingsPercent = fullPrice > 0 ? Math.round((1 - p.priceAmount / fullPrice) * 100) : 0;
      return { ...p, savingsPercent };
    });

    return NextResponse.json({ success: true, plans: withSavings });
  } catch (error) {
    console.error("[GET /api/plans]", error);
    return NextResponse.json({ success: false, message: "Failed to load plans" }, { status: 500 });
  }
}