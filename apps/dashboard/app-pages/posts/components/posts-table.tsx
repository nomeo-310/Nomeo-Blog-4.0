"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableRowsSkeleton, type SkeletonColumn } from "@/components/features/table-rows-skeleton";
import { StatusBadge, AccessBadge, ReportsBadge } from "./post-badges";
import { formatCompactNumber, formatDate } from "../utils";
import type { PostsListResponse } from "../types";

const COLUMN_COUNT = 8;
const SKELETON_COLUMNS: SkeletonColumn[] = [
  { width: "w-40", lines: 2 },
  { width: "w-14" },
  { width: "w-16" },
  { width: "w-10" },
  { width: "w-10" },
  { width: "w-10" },
  { width: "w-14" },
  { width: "w-20" },
];

export function PostsTable({
  data, isLoading, isFetching, onSelectPost, onPageChange,
}: {
  data?: PostsListResponse;
  isLoading: boolean;
  isFetching: boolean;
  onSelectPost: (postId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const isEmpty = !isLoading && !data?.posts.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Post</TableHead>
            <TableHead>Access</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Views</TableHead>
            <TableHead>Likes</TableHead>
            <TableHead>Comments</TableHead>
            <TableHead>Reports</TableHead>
            <TableHead>Published</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : ""}>
          {isLoading ? (
            <TableRowsSkeleton columns={SKELETON_COLUMNS} rows={8} />
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={COLUMN_COUNT} className="py-14 text-center text-sm text-muted-foreground">
                No posts match these filters.
              </TableCell>
            </TableRow>
          ) : (
            data!.posts.map((post) => (
              <TableRow key={post.id} className="cursor-pointer" onClick={() => onSelectPost(post.id)}>
                <TableCell className="max-w-80 whitespace-normal">
                  <div className="flex items-start gap-1.5">
                    {post.isFeatured && <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{post.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">by {post.author.name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><AccessBadge access={post.access} /></TableCell>
                <TableCell><StatusBadge status={post.status} /></TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(post.viewsCount)}</TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(post.likesCount)}</TableCell>
                <TableCell className="tabular-nums">{formatCompactNumber(post.commentsCount)}</TableCell>
                <TableCell><ReportsBadge count={post.pendingReportsCount} /></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(post.publishedAt ?? post.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && !isEmpty && data && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} posts
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
