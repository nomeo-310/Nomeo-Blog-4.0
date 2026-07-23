"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatSeriesTick } from "../utils";
import type { SeriesPoint } from "../types";

function ChartTooltip({
  active, payload, label, valueFormatter,
}: {
  active?:  boolean;
  payload?: { value: number }[];
  label?:   string;
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{formatSeriesTick(label)}</p>
      <p className="mt-0.5 text-muted-foreground">{valueFormatter(payload[0].value)}</p>
    </div>
  );
}

export function TimeSeriesChart({
  data, valueFormatter = (v) => v.toLocaleString(), height = 220,
}: {
  data: SeriesPoint[];
  valueFormatter?: (value: number) => string;
  height?: number;
}) {
  const isEmpty = data.every((d) => d.value === 0);

  return (
    <div style={{ height }} className="relative w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="analyticsAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatSeriesTick}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={<ChartTooltip valueFormatter={valueFormatter} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#analyticsAreaFill)"
            activeDot={{ r: 4, strokeWidth: 0 }}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          No activity in this period
        </div>
      )}
    </div>
  );
}
