"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePostsLeaderboard } from "../use-posts-leaderboard";
import { formatCompactNumber } from "../utils";
import type { PostAccessFilter, PostSortBy } from "../types";

const SORT_OPTIONS: { value: PostSortBy; label: string }[] = [
  { value: "engagement",     label: "Engagement" },
  { value: "views",          label: "Views" },
  { value: "reads",          label: "Reads" },
  { value: "completionRate", label: "Completion rate" },
  { value: "likes",          label: "Likes" },
  { value: "comments",       label: "Comments" },
  { value: "saves",          label: "Saves" },
  { value: "readMinutes",    label: "Subscriber read-minutes" },
];

const RANGE_OPTIONS = [
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
] as const;

export function PostsLeaderboard({ onSelectPost }: { onSelectPost: (postId: string) => void }) {
  const [range, setRange]     = useState<(typeof RANGE_OPTIONS)[number]["value"]>("30d");
  const [access, setAccess]   = useState<PostAccessFilter>("all");
  const [sortBy, setSortBy]   = useState<PostSortBy>("engagement");
  const [order, setOrder]     = useState<"asc" | "desc">("desc");
  const [page, setPage]       = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]   = useState("");

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching } = usePostsLeaderboard({
    window: { preset: range },
    access, topic: null, search, sortBy, order, page, limit: 10,
  });

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">Content performance</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Ranked by {SORT_OPTIONS.find((o) => o.value === sortBy)?.label.toLowerCase()}.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-45 flex-1">
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title…"
              className="pl-6"
            />
          </div>

          <Select value={range} onValueChange={(v) => { setRange(v as typeof range); setPage(1); }}>
            <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
            <SelectContent className={'p-1'}>
              {RANGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={access} onValueChange={(v) => { setAccess(v as PostAccessFilter); setPage(1); }}>
            <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
            <SelectContent className={'p-1'}>
              <SelectItem value="all">All access</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => { setSortBy(v as PostSortBy); setPage(1); }}>
            <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
            <SelectContent className={'p-1'}>
              {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button
            type="button" size="icon-sm" variant="outline"
            onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
            title={order === "desc" ? "Descending" : "Ascending"}
            className={'rounded-md'}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : !data?.posts.length ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No posts match these filters.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Reads</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Likes</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead>Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={isFetching ? "opacity-60 transition-opacity" : ""}>
              {data.posts.map((post) => (
                <TableRow
                  key={post.id}
                  className="cursor-pointer"
                  onClick={() => onSelectPost(post.id)}
                >
                  <TableCell className="max-w-70 whitespace-normal">
                    <p className="truncate font-medium text-foreground">{post.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">by {post.author.name}</p>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">{post.access}</TableCell>
                  <TableCell className="tabular-nums">{formatCompactNumber(post.metrics.views)}</TableCell>
                  <TableCell className="tabular-nums">{formatCompactNumber(post.metrics.reads)}</TableCell>
                  <TableCell className="tabular-nums">{post.metrics.completionRatePct}%</TableCell>
                  <TableCell className="tabular-nums">{formatCompactNumber(post.metrics.likes)}</TableCell>
                  <TableCell className="tabular-nums">{formatCompactNumber(post.metrics.comments)}</TableCell>
                  <TableCell className="tabular-nums font-medium text-foreground">{formatCompactNumber(post.metrics.engagementScore)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} posts
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                type="button" size="icon-sm" variant="outline"
                disabled={data.pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button" size="icon-sm" variant="outline"
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
