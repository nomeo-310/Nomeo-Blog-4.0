"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import { PLACEMENT_OPTIONS as ADVERT_PLACEMENT_OPTIONS } from "../placement-options";
import type {
  AdvertPlacementFilter, AdvertSortBy, AdvertStatusFilter, AdvertTypeFilter,
} from "../types";

const TYPE_OPTIONS: { value: AdvertTypeFilter; label: string }[] = [
  { value: "all",            label: "All types" },
  { value: "house",          label: "House" },
  { value: "sponsored",      label: "Sponsored" },
  { value: "promoted_post",  label: "Promoted post" },
  { value: "creator_promo",  label: "Creator promo" },
];

const STATUS_OPTIONS: { value: AdvertStatusFilter; label: string }[] = [
  { value: "all",             label: "All statuses" },
  { value: "draft",           label: "Draft" },
  { value: "pending_review",  label: "Pending review" },
  { value: "approved",        label: "Approved" },
  { value: "scheduled",       label: "Scheduled" },
  { value: "active",          label: "Active" },
  { value: "paused",          label: "Paused" },
  { value: "completed",       label: "Completed" },
  { value: "rejected",        label: "Rejected" },
];

const PLACEMENT_OPTIONS: { value: AdvertPlacementFilter; label: string }[] = [
  { value: "all", label: "All placements" },
  ...ADVERT_PLACEMENT_OPTIONS,
];

const SORT_OPTIONS: { value: AdvertSortBy; label: string }[] = [
  { value: "newest",           label: "Newest first" },
  { value: "oldest",           label: "Oldest first" },
  { value: "most_impressions", label: "Most impressions" },
  { value: "most_clicks",      label: "Most clicks" },
  { value: "priority",         label: "Priority" },
];

export function AdvertsFilterBar({
  search, onSearchChange,
  type, onTypeChange,
  status, onStatusChange,
  placement, onPlacementChange,
  sortBy, onSortByChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  type: AdvertTypeFilter; onTypeChange: (value: AdvertTypeFilter) => void;
  status: AdvertStatusFilter; onStatusChange: (value: AdvertStatusFilter) => void;
  placement: AdvertPlacementFilter; onPlacementChange: (value: AdvertPlacementFilter) => void;
  sortBy: AdvertSortBy; onSortByChange: (value: AdvertSortBy) => void;
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

      <FilterField label="Type">
        <Select value={type} onValueChange={(v) => onTypeChange(v as AdvertTypeFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as AdvertStatusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Placement">
        <Select value={placement} onValueChange={(v) => onPlacementChange(v as AdvertPlacementFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {PLACEMENT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Sort by">
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as AdvertSortBy)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
