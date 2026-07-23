"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export interface SkeletonColumn {
  /** Tailwind width class for the skeleton bar, e.g. "w-32". */
  width: string;
  /** Two stacked bars (title + subtitle) for compound cells like "title by author". */
  lines?: 1 | 2;
}

/**
 * Loading placeholder for a data table — renders as real `<TableRow>`s so it
 * drops straight into an existing `<TableBody>` with the header already visible
 * and no layout shift once data arrives. Never wrap this in its own box.
 */
export function TableRowsSkeleton({ columns, rows = 6 }: { columns: SkeletonColumn[]; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {columns.map((col, colIndex) => (
            <TableCell key={colIndex}>
              {col.lines === 2 ? (
                <div className="space-y-1.5">
                  <Skeleton className={`h-3.5 ${col.width} rounded`} />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              ) : (
                <Skeleton className={`h-3.5 ${col.width} rounded`} />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
