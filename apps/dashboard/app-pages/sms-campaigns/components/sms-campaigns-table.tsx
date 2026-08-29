"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { SmsCampaignStatusBadge, SmsAudienceBadge } from "./sms-campaign-badges";
import { formatDate } from "../utils";
import type { SmsCampaignsListResponse } from "../types";

const COLUMN_COUNT = 5;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-48", lines: 2 },
  { width: "w-24" },
  { width: "w-20" },
  { width: "w-24" },
  { width: "w-20" },
];

export function SmsCampaignsTable({
  data, isLoading, isFetching, onSelectCampaign, onPageChange,
}: {
  data?: SmsCampaignsListResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectCampaign: (campaignId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.campaigns.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No SMS campaigns match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.campaigns.map((c) => (
              <TableRow key={c.id} className="cursor-pointer" onClick={() => onSelectCampaign(c.id)}>
                <TableCell className="max-w-64 whitespace-normal">
                  <p className="truncate font-medium text-foreground">{c.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.message}</p>
                </TableCell>
                <TableCell><SmsAudienceBadge audience={c.audience} /></TableCell>
                <TableCell><SmsCampaignStatusBadge status={c.status} /></TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {c.recipients.total > 0 ? `${c.recipients.successful}/${c.recipients.total}` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} campaigns
          </p>
          <div className="flex items-center gap-1.5">
            <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page <= 1} onClick={() => onPageChange(Math.max(1, data.pagination.page - 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="icon-sm" variant="outline" className="rounded-md" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => onPageChange(data.pagination.page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
