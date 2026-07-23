export type AnalyticsRange = "7d" | "30d" | "90d" | "12m";

const RANGES: readonly AnalyticsRange[] = ["7d", "30d", "90d", "12m"];

export interface ResolvedRange {
  range:  AnalyticsRange;
  /** Start of the current period (inclusive, midnight). */
  since:  Date;
  /** Start of the immediately preceding period of equal length — for growth %. */
  prevSince: Date;
  /** Bucket granularity used for time-series aggregation. */
  bucket: "day" | "month";
}

/** Parses a `range` query param into concrete date boundaries + series bucket size. */
export function resolveRange(rangeParam: string | null): ResolvedRange {
  const range: AnalyticsRange = RANGES.includes(rangeParam as AnalyticsRange)
    ? (rangeParam as AnalyticsRange)
    : "30d";

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const prevSince = new Date(since);
  let bucket: "day" | "month" = "day";

  switch (range) {
    case "7d":
      since.setDate(since.getDate() - 7);
      prevSince.setDate(prevSince.getDate() - 14);
      break;
    case "30d":
      since.setDate(since.getDate() - 30);
      prevSince.setDate(prevSince.getDate() - 60);
      break;
    case "90d":
      since.setDate(since.getDate() - 90);
      prevSince.setDate(prevSince.getDate() - 180);
      break;
    case "12m":
      since.setMonth(since.getMonth() - 12);
      prevSince.setMonth(prevSince.getMonth() - 24);
      bucket = "month";
      break;
  }

  return { range, since, prevSince, bucket };
}

export interface ResolvedWindow {
  range:     AnalyticsRange | "custom";
  since:     Date;
  until:     Date;
  prevSince: Date;
  prevUntil: Date;
  bucket:    "day" | "month";
}

/**
 * Resolves either an explicit `from`/`to` custom window or a `range` preset from
 * query params. `from`/`to` take priority — this is what backs the calendar
 * range picker, while `range` backs the quick-select chips.
 */
export function resolveWindow(searchParams: URLSearchParams): ResolvedWindow {
  const fromParam = searchParams.get("from");
  const toParam    = searchParams.get("to");

  if (fromParam) {
    const since = new Date(fromParam);
    since.setHours(0, 0, 0, 0);
    const until = toParam ? new Date(toParam) : new Date();
    until.setHours(23, 59, 59, 999);

    const spanMs    = Math.max(until.getTime() - since.getTime(), 1);
    const prevUntil = new Date(since.getTime() - 1);
    const prevSince = new Date(since.getTime() - spanMs);
    // Bucket by month once the window is wide enough that daily buckets would be unreadable.
    const bucket: "day" | "month" = spanMs > 1000 * 60 * 60 * 24 * 120 ? "month" : "day";

    return { range: "custom", since, until, prevSince, prevUntil, bucket };
  }

  const preset    = resolveRange(searchParams.get("range"));
  const until     = new Date();
  const prevUntil = new Date(preset.since.getTime() - 1);
  return { ...preset, until, prevUntil };
}

/** % change from `previous` to `current`, rounded to one decimal. Null when there's nothing to compare against. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** `$dateTrunc` expression bucketing a date field to the given granularity. */
export function dateTruncStage(field: string, bucket: "day" | "month") {
  return { $dateTrunc: { date: `$${field}`, unit: bucket } };
}

/** Key a bucketed date the same way for both Mongo output and the gap-filler below. */
function bucketKey(date: Date, bucket: "day" | "month"): string {
  const iso = date.toISOString();
  return bucket === "month" ? iso.slice(0, 7) : iso.slice(0, 10);
}

export interface SeriesPoint {
  date:  string;
  value: number;
}

/**
 * Zero-fills a sparse `{ _id: Date, value: number }[]` aggregation result into a
 * continuous series from `since` to `until` (defaults to now), so charts don't
 * show gaps as missing data.
 */
export function fillSeries(
  rows: { _id: Date | string; value: number }[],
  since: Date,
  bucket: "day" | "month",
  until: Date = new Date()
): SeriesPoint[] {
  const byKey = new Map(rows.map((r) => [bucketKey(new Date(r._id), bucket), r.value]));

  const points: SeriesPoint[] = [];
  const cursor = new Date(since);

  while (cursor <= until) {
    const key = bucketKey(cursor, bucket);
    points.push({ date: key, value: byKey.get(key) ?? 0 });
    if (bucket === "month") cursor.setMonth(cursor.getMonth() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}
