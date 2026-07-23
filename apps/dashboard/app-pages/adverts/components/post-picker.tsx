"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePostSearch, type PostSearchResult } from "../use-post-search";

export function PostPicker({
  selectedPost, onSelect,
}: {
  selectedPost: PostSearchResult | null;
  onSelect: (post: PostSearchResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = usePostSearch(query);

  if (selectedPost) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{selectedPost.title}</p>
          <p className="text-xs text-muted-foreground">by {selectedPost.authorName}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search published posts by title…"
          className="pl-9"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
          {isFetching ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
          ) : !results?.length ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No published posts match.</p>
          ) : (
            results.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onSelect(post)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
              >
                <span className="truncate font-medium text-foreground">{post.title}</span>
                <span className="text-xs text-muted-foreground">by {post.authorName}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
