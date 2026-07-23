"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePostsList } from "./use-posts-list";
import { PostsFilterBar } from "./components/posts-filter-bar";
import { PostsTable }     from "./components/posts-table";
import { PostDetailModal } from "./components/post-detail-modal";
import type { PostAccessFilter, PostSortBy, PostStatusFilter } from "./types";

export default function PostsPage() {
  const [status, setStatus]   = useState<PostStatusFilter>("all");
  const [access, setAccess]   = useState<PostAccessFilter>("all");
  const [hasOpenReports, setHasOpenReports] = useState(false);
  const [sortBy, setSortBy]   = useState<PostSortBy>("newest");
  const [page, setPage]       = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]   = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Debounce free-text search so we don't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = usePostsList({
    status, access, hasOpenReports, search, sortBy, page, limit: 20,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Posts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Review, feature, and moderate every post on the platform.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <PostsFilterBar
        search={searchInput} onSearchChange={setSearchInput}
        status={status} onStatusChange={(v) => { setStatus(v); setPage(1); }}
        access={access} onAccessChange={(v) => { setAccess(v); setPage(1); }}
        hasOpenReports={hasOpenReports} onHasOpenReportsChange={(v) => { setHasOpenReports(v); setPage(1); }}
        sortBy={sortBy} onSortByChange={(v) => { setSortBy(v); setPage(1); }}
      />

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <PostsTable
          data={data}
          isLoading={isLoading}
          isFetching={isFetching}
          onSelectPost={setSelectedPostId}
          onPageChange={setPage}
        />
      </div>

      <PostDetailModal postId={selectedPostId} onClose={() => setSelectedPostId(null)} />
    </div>
  );
}
