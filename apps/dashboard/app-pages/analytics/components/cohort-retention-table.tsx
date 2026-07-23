"use client";

import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import type { CohortRow } from "../types";

function formatCohortMonth(cohortMonth: string): string {
  const date = new Date(`${cohortMonth}-01T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function CohortRetentionTable({ cohorts, windowDays }: { cohorts: CohortRow[]; windowDays: number }) {
  if (cohorts.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Not enough signup history yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Signup cohort</TableHead>
          <TableHead>Cohort size</TableHead>
          <TableHead>Active in last {windowDays}d</TableHead>
          <TableHead>Retention</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cohorts.map((c) => (
          <TableRow key={c.cohortMonth}>
            <TableCell className="font-medium text-foreground">{formatCohortMonth(c.cohortMonth)}</TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{c.cohortSize.toLocaleString()}</TableCell>
            <TableCell className="tabular-nums text-muted-foreground">{c.activeCount.toLocaleString()}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(c.retentionPct, 2)}%` }}
                  />
                </div>
                <span className="tabular-nums text-xs font-medium text-foreground">{c.retentionPct}%</span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
