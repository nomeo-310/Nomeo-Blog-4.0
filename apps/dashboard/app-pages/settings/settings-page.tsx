"use client";

import { useState } from "react";
import { Loader2, Info } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SaveIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMe } from "@/app-pages/account/use-me";
import { useEarningsSettings, useUpdateEarningsSettings, type PayoutModel } from "./use-earnings-settings";

const MODEL_OPTIONS: { value: PayoutModel; label: string; description: string }[] = [
  { value: "fixed_rate", label: "Fixed rate per read", description: "Writers earn a flat amount per completed read, known in advance. Scaled down for a month only if total demand exceeds that month's revenue pool." },
  { value: "pool_share", label: "Revenue pool share", description: "The monthly pool is split across writers by their share of subscriber read-minutes. Always exactly exhausts the pool; a read's value isn't known until the month closes." },
];

/**
 * SettingsPage — platform-wide settings, currently just Earnings.
 *
 * Route: app/(root)/settings/page.tsx
 * Component: app-pages/settings/settings-page.tsx
 *
 * Backs the creator revenue mechanics (see the client app's
 * services/earnings-service.ts): which pricing model is active, the
 * platform's cut of the monthly subscription pool, the fixed-rate model's
 * per-read rate, the pool-share model's completed-read weighting, and the
 * minimum a creator can request as a payout. These live in the
 * PlatformSettings collection, not in code, so they can be tuned or
 * switched here without a deploy.
 */
export default function SettingsPage() {
  const { data: me } = useMe();
  const canEdit = me?.role === "super_admin";

  const { data: settings, isLoading } = useEarningsSettings();
  const update = useUpdateEarningsSettings();

  const [payoutModel, setPayoutModel] = useState<PayoutModel>("fixed_rate");
  const [platformCutPercent, setPlatformCutPercent] = useState("");
  const [ratePerCompletedReadNaira, setRatePerCompletedReadNaira] = useState("");
  const [completedReadWeight, setCompletedReadWeight] = useState("");
  const [minimumPayoutNaira, setMinimumPayoutNaira] = useState("");
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  if (settings && syncedAt !== settings.updatedAt) {
    setPayoutModel(settings.payoutModel);
    setPlatformCutPercent(String(settings.platformCutPercent));
    setRatePerCompletedReadNaira(String(settings.ratePerCompletedRead / 100));
    setCompletedReadWeight(String(settings.completedReadWeight));
    setMinimumPayoutNaira(String(settings.minimumPayoutAmount / 100));
    setSyncedAt(settings.updatedAt);
  }

  if (isLoading || !settings) {
    return (
      <div className="max-w-xl space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const cutNum = Number(platformCutPercent);
  const rateNairaNum = Number(ratePerCompletedReadNaira);
  const weightNum = Number(completedReadWeight);
  const minNairaNum = Number(minimumPayoutNaira);

  const valid =
    platformCutPercent.trim() !== "" && !Number.isNaN(cutNum) && cutNum >= 0 && cutNum <= 100 &&
    ratePerCompletedReadNaira.trim() !== "" && !Number.isNaN(rateNairaNum) && rateNairaNum >= 0 &&
    completedReadWeight.trim() !== "" && !Number.isNaN(weightNum) && weightNum >= 1 && weightNum <= 5 &&
    minimumPayoutNaira.trim() !== "" && !Number.isNaN(minNairaNum) && minNairaNum >= 0;

  const dirty =
    valid && (
      payoutModel !== settings.payoutModel ||
      cutNum !== settings.platformCutPercent ||
      Math.round(rateNairaNum * 100) !== settings.ratePerCompletedRead ||
      weightNum !== settings.completedReadWeight ||
      Math.round(minNairaNum * 100) !== settings.minimumPayoutAmount
    );

  const handleSave = () => {
    if (!valid || !dirty) return;
    update.mutate({
      payoutModel,
      platformCutPercent: cutNum,
      ratePerCompletedRead: Math.round(rateNairaNum * 100),
      completedReadWeight: weightNum,
      minimumPayoutAmount: Math.round(minNairaNum * 100),
    });
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Platform-wide configuration.</p>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Creator earnings</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Controls how much writers earn and how it&apos;s calculated each month.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Pricing model</Label>
          <Select value={payoutModel} onValueChange={(v) => v && setPayoutModel(v as PayoutModel)}>
            <SelectTrigger className="w-full rounded-xl border-border bg-background text-sm" disabled={!canEdit}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="p-1">
              {MODEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {MODEL_OPTIONS.find((o) => o.value === payoutModel)?.description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="platform-cut">Platform cut (%)</Label>
            <Input
              id="platform-cut" type="number" min={0} max={100} step="0.1"
              value={platformCutPercent}
              onChange={(e) => setPlatformCutPercent(e.target.value)}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">Share of subscription revenue the platform keeps each period.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min-payout">Minimum payout ({settings.currency})</Label>
            <Input
              id="min-payout" type="number" min={0} step="1"
              value={minimumPayoutNaira}
              onChange={(e) => setMinimumPayoutNaira(e.target.value)}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">Balance a creator must reach to request a payout.</p>
          </div>

          {payoutModel === "fixed_rate" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rate-per-read">Rate per completed read ({settings.currency})</Label>
              <Input
                id="rate-per-read" type="number" min={0} step="0.01"
                value={ratePerCompletedReadNaira}
                onChange={(e) => setRatePerCompletedReadNaira(e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">
                What a writer earns each time a subscriber reads one of their paid posts to the end. Scaled down for a month only if total completed reads would cost more than that month&apos;s pool.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="read-weight">Completed-read weight (×)</Label>
              <Input
                id="read-weight" type="number" min={1} max={5} step="0.1"
                value={completedReadWeight}
                onChange={(e) => setCompletedReadWeight(e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">Multiplier a fully-read paid post earns over a partial read, when splitting the pool.</p>
            </div>
          )}
        </div>

        {!canEdit && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Only super admins can change these values. You&apos;re viewing them read-only.
          </div>
        )}

        {canEdit && (
          <div className={cn("flex justify-end border-t border-border pt-4")}>
            <Button
              type="button" size="sm" className="rounded-full"
              disabled={!dirty || update.isPending}
              onClick={handleSave}
            >
              {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HugeiconsIcon icon={SaveIcon} className="h-3.5 w-3.5" />}
              Save changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
