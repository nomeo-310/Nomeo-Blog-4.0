"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type { UserBanFilter, UserSortBy } from "../types";

const BAN_OPTIONS: { value: UserBanFilter; label: string }[] = [
  { value: "all",           label: "All statuses" },
  { value: "active",        label: "Active" },
  { value: "banned",        label: "Banned" },
  { value: "shadow_banned", label: "Shadow banned" },
];

const SORT_OPTIONS: { value: UserSortBy; label: string }[] = [
  { value: "newest",         label: "Newest first" },
  { value: "oldest",         label: "Oldest first" },
  { value: "most_followers", label: "Most followers" },
  { value: "most_posts",     label: "Most posts" },
];

export function UsersFilterBar({
  search, onSearchChange,
  banStatus, onBanStatusChange,
  sortBy, onSortByChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  banStatus: UserBanFilter; onBanStatusChange: (value: UserBanFilter) => void;
  sortBy: UserSortBy; onSortByChange: (value: UserSortBy) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-64 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, or username…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <Select value={banStatus} onValueChange={(v) => onBanStatusChange(v as UserBanFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {BAN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Sort by">
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as UserSortBy)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
