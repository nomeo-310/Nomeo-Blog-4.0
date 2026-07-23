"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type { PostAccessFilter, PostSortBy, PostStatusFilter } from "../types";

const STATUS_OPTIONS: { value: PostStatusFilter; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft",     label: "Draft" },
  { value: "archived",  label: "Archived" },
  { value: "removed",   label: "Removed" },
];

const SORT_OPTIONS: { value: PostSortBy; label: string }[] = [
  { value: "newest",        label: "Newest first" },
  { value: "oldest",        label: "Oldest first" },
  { value: "most_viewed",   label: "Most viewed" },
  { value: "most_reported", label: "Most reported" },
];

export function PostsFilterBar({
  search, onSearchChange,
  status, onStatusChange,
  access, onAccessChange,
  hasOpenReports, onHasOpenReportsChange,
  sortBy, onSortByChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  status: PostStatusFilter; onStatusChange: (value: PostStatusFilter) => void;
  access: PostAccessFilter; onAccessChange: (value: PostAccessFilter) => void;
  hasOpenReports: boolean; onHasOpenReportsChange: (value: boolean) => void;
  sortBy: PostSortBy; onSortByChange: (value: PostSortBy) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-64 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as PostStatusFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Access">
        <Select value={access} onValueChange={(v) => onAccessChange(v as PostAccessFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            <SelectItem value="all">All access</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Sort by">
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as PostSortBy)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Reports">
        <div className="flex h-9 items-center gap-2">
          <Switch id="open-reports" checked={hasOpenReports} onCheckedChange={onHasOpenReportsChange} />
          <Label htmlFor="open-reports" className="cursor-pointer text-sm normal-case">Open reports only</Label>
        </div>
      </FilterField>
    </div>
  );
}