"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { AdvertStatusBadge, TypeBadge, PlacementBadge } from "./advert-badges";
import { formatCompactNumber, formatDate, formatPct } from "../utils";
import type { AdvertsListResponse } from "../types";

const COLUMN_COUNT = 8;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-40", lines: 2 },
  { width: "w-16" },
  { width: "w-24" },
  { width: "w-20" },
  { width: "w-10" },
  { width: "w-10" },
  { width: "w-10" },
  { width: "w-20" },
];

export function AdvertsTable({
  data, isLoading, isFetching, onSelectAdvert, onPageChange,
}: {
  data?: AdvertsListResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectAdvert: (advertId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.adverts.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Advert</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Placement</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Impressions</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>CTR</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No adverts match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.adverts.map((advert) => (
              <TableRow key={advert.id} className="cursor-pointer" onClick={() => onSelectAdvert(advert.id)}>
                <TableCell className="max-w-80 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{advert.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">by {advert.createdBy.name}</p>
                </TableCell>
                <TableCell><TypeBadge type={advert.type} /></TableCell>
                <TableCell><PlacementBadge placement={advert.placement} /></TableCell>
                <TableCell><AdvertStatusBadge status={advert.status} /></TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(advert.metrics.impressions)}</TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(advert.metrics.clicks)}</TableCell>
                <TableCell className="tabular-nums">{formatPct(advert.ctr)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(advert.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} adverts
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              type="button" size="icon-sm" variant="outline" className="rounded-md"
              disabled={data.pagination.page <= 1}
              onClick={() => onPageChange(Math.max(1, data.pagination.page - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button" size="icon-sm" variant="outline" className="rounded-md"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => onPageChange(data.pagination.page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
