import mongoose from "mongoose";
import { DollarSign, TrendingUp, Calendar, Info } from "lucide-react";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { getPlatformSettings } from "@/models/platform-settings";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { Metadata } from "next";
import DashboardLayout from "@/components/features/dashboard-layout";
import { RequestPayoutButton } from "@/app-pages/dashboard/earnings/request-payout-button";

export const metadata: Metadata = {
  title: 'Earnings',
}

/** Route: app/dashboard/earnings/page.tsx — creator only */
export default async function Earnings() {

  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  const { periods, totalKobo, pendingKobo, minimumPayoutKobo, hasPayoutDetails, payoutModel, platformCutPercent, ratePerCompletedReadKobo, completedReadWeight } = await getEarnings(user.id);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full max-w-5xl">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Earnings</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your share of QuilHub's monthly revenue pool.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><DollarSign className="h-5 w-5" /></span>
            <p className="mt-4 font-heading text-2xl font-bold text-foreground">{formatMoney(totalKobo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total earned (all time)</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></span>
            <p className="mt-4 font-heading text-2xl font-bold text-foreground">{formatMoney(pendingKobo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Pending payout</p>
          </div>
        </div>

        {/* How earnings work */}
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Info className="h-4.5 w-4.5 shrink-0 text-primary mt-0.5" />
          <div className="text-sm leading-relaxed text-muted-foreground">
            {payoutModel === "fixed_rate" ? (
              <p>
                You earn <strong className="text-foreground">{formatMoney(ratePerCompletedReadKobo)}</strong> every time a subscriber reads one of your paid posts all the way to the end — partial reads earn nothing. QuilHub keeps {platformCutPercent}% of subscription revenue to run the platform; the rest funds payouts. If total completed reads in a month would cost more than that month&apos;s pool, every writer&apos;s payout for that month is scaled down by the same percentage — you&apos;ll see it noted on the period if it happens.
              </p>
            ) : (
              <p>
                Each month, QuilHub pools everyone&apos;s subscription payments, keeps {platformCutPercent}% to run the platform, and splits the rest across creators by their share of total subscriber read-minutes — a fully-read paid post counts {completedReadWeight}× a partially-read one. The more your paid posts are read by members, the larger your slice.
              </p>
            )}
            <p className="mt-2">
              Each subscriber counts once per post, no matter how many times they revisit it — re-reads don&apos;t add extra earnings, so there&apos;s no advantage to inflating read counts.
            </p>
            <p className="mt-2">
              Once a month closes, request your payout below — it needs verified bank details in <a href="/dashboard/settings" className="font-medium text-primary underline underline-offset-2">Settings</a> and a balance of at least {formatMoney(minimumPayoutKobo)}; smaller balances roll into the next month.
            </p>
          </div>
        </div>

        {/* Period history */}
        {periods.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            <h3 className="mt-4 font-heading text-base font-bold text-foreground">No earnings yet</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">Publish paid posts and build an audience to start earning from the QuilHub revenue pool.</p>
          </div>
        ) : (
          <div>
            <h3 className="mb-4 font-heading text-base font-bold text-foreground">Monthly breakdown</h3>
            <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
              {periods.map((p) => (
                <div key={p.period} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatPeriod(p.period)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.payoutModel === "fixed_rate"
                          ? `${Math.round(p.completedReadsCount)} completed read${Math.round(p.completedReadsCount) === 1 ? "" : "s"}${p.payoutScaleFactor < 1 ? ` · scaled to ${(p.payoutScaleFactor * 100).toFixed(0)}%` : ""}`
                          : `${(p.sharePercent * 100).toFixed(2)}% of platform reads`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatMoney(p.netKobo)}</p>
                      <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5",
                        p.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : p.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-muted text-muted-foreground"
                      )}>
                        {p.status === "calculated" && p.payoutRequestedAt ? "requested" : p.status}
                      </span>
                    </div>
                    {p.status === "calculated" && !p.payoutRequestedAt && (
                      hasPayoutDetails ? (
                        p.netKobo >= minimumPayoutKobo ? (
                          <RequestPayoutButton earningId={p.id} />
                        ) : (
                          <span className="max-w-36 text-right text-[10px] leading-tight text-muted-foreground">
                            Below {formatMoney(minimumPayoutKobo)} minimum — rolls forward
                          </span>
                        )
                      ) : (
                        <a href="/dashboard/settings" className="text-[11px] font-semibold text-primary underline underline-offset-2">
                          Add payout details
                        </a>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

async function getEarnings(userId: string) {
  const empty = {
    periods: [], totalKobo: 0, pendingKobo: 0, minimumPayoutKobo: 0, hasPayoutDetails: false,
    payoutModel: "fixed_rate" as const, platformCutPercent: 30, ratePerCompletedReadKobo: 1500, completedReadWeight: 1.5,
  };
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return empty;

    const uid = new mongoose.Types.ObjectId(userId);
    const [raw, settings, profile] = await Promise.all([
      db.collection("creator_earnings").find({ creatorId: uid }).sort({ billingPeriod: -1 }).limit(24).toArray(),
      getPlatformSettings(),
      db.collection("profiles").findOne({ userId: uid }, { projection: { "payoutDetails.recipientCode": 1 } }),
    ]);

    const periods = raw.map((r) => ({
      id: String(r._id),
      period: String(r.billingPeriod),
      payoutModel: String(r.payoutModel || "fixed_rate") as "fixed_rate" | "pool_share",
      completedReadsCount: Number(r.completedReadsCount || 0),
      payoutScaleFactor: Number(r.payoutScaleFactor ?? 1),
      grossKobo: Number(r.grossAmount || 0),
      netKobo: Number(r.netAmount || 0),
      sharePercent: Number(r.readMinutesShare || 0),
      status: String(r.payoutStatus || "pending"),
      payoutRequestedAt: r.payoutRequestedAt ? String(r.payoutRequestedAt) : null,
    }));
    // "Pending payout" = anything not yet paid out, not just the literal
    // "pending" status (which actually means "period still accumulating
    // reads" — calculated/processing/on_hold are just as much awaiting payout).
    const totalKobo = periods.reduce((s, p) => s + p.netKobo, 0);
    const pendingKobo = periods.filter((p) => p.status !== "paid").reduce((s, p) => s + p.netKobo, 0);
    return {
      periods,
      totalKobo,
      pendingKobo,
      minimumPayoutKobo: settings.minimumPayoutAmount,
      hasPayoutDetails: Boolean(profile?.payoutDetails?.recipientCode),
      payoutModel: settings.payoutModel,
      platformCutPercent: settings.platformCutPercent,
      ratePerCompletedReadKobo: settings.ratePerCompletedRead,
      completedReadWeight: settings.completedReadWeight,
    };
  } catch { return empty; }
}

function formatMoney(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en", { month: "long", year: "numeric" });
}