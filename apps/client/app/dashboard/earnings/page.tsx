import mongoose from "mongoose";
import { DollarSign, TrendingUp, Calendar, Info } from "lucide-react";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { Metadata } from "next";
import DashboardLayout from "@/components/features/dashboard-layout";

export const metadata: Metadata = {
  title: 'Earnings',
}

/** Route: app/dashboard/earnings/page.tsx — creator only */
export default async function Earnings() {
  
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "creator") redirect("/dashboard");

  const { periods, totalKobo, pendingKobo } = await getEarnings(user.id);

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full max-w-5xl">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Earnings</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your share of Nomeo's monthly revenue pool.</p>
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
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your earnings are calculated monthly based on your share of total subscriber read-minutes across the platform. The more your paid posts are read by members, the larger your slice of the revenue pool.
          </p>
        </div>

        {/* Period history */}
        {periods.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            <h3 className="mt-4 font-heading text-base font-bold text-foreground">No earnings yet</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">Publish paid posts and build an audience to start earning from the Nomeo revenue pool.</p>
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
                      <p className="text-xs text-muted-foreground">{(p.sharePercent * 100).toFixed(2)}% of platform reads</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatMoney(p.grossKobo)}</p>
                    <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5",
                      p.status === "paid" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : p.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-muted text-muted-foreground"
                    )}>
                      {p.status}
                    </span>
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
  const empty = { periods: [], totalKobo: 0, pendingKobo: 0 };
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return empty;
    const raw = await db.collection("creator_earnings")
      .find({ creatorId: new mongoose.Types.ObjectId(userId) })
      .sort({ billingPeriod: -1 }).limit(24).toArray();
    const periods = raw.map((r: any) => ({
      period: String(r.billingPeriod),
      grossKobo: Number(r.grossPayoutKobo || 0),
      netKobo: Number(r.netPayoutKobo || 0),
      sharePercent: Number(r.shareOfPool || 0),
      status: String(r.status || "pending"),
    }));
    const totalKobo = periods.reduce((s, p) => s + p.netKobo, 0);
    const pendingKobo = periods.filter((p) => p.status === "pending").reduce((s, p) => s + p.netKobo, 0);
    return { periods, totalKobo, pendingKobo };
  } catch { return empty; }
}

function formatMoney(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en", { month: "long", year: "numeric" });
}