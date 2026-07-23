import type { DateWindow } from "./types";

export function formatKobo(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatPct(value: number): string {
  return `${value}%`;
}

export function formatSecondsAsDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

/** Chart tick label: "Jan 5" for daily buckets, "Jan 2025" for monthly buckets. */
export function formatSeriesTick(dateKey: string): string {
  const isMonthly = dateKey.length === 7; // "YYYY-MM"
  const date = new Date(isMonthly ? `${dateKey}-01T00:00:00Z` : `${dateKey}T00:00:00Z`);
  return isMonthly
    ? date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Builds the `range`/`from`/`to` query params for the analytics API from a DateWindow. */
export function dateWindowToParams(window: DateWindow): Record<string, string> {
  if (window.preset === "custom" && window.from) {
    return {
      from: window.from.toISOString().slice(0, 10),
      to:   (window.to ?? window.from).toISOString().slice(0, 10),
    };
  }
  if (window.preset === "all") return { range: "all" };
  return { range: window.preset === "custom" ? "30d" : window.preset };
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
