"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type { SubscriptionStatusFilter, SubscriptionSortBy } from "../types";

const STATUS_OPTIONS: { value: SubscriptionStatusFilter; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "active",    label: "Active" },
  { value: "trialing",  label: "Trialing" },
  { value: "past_due",  label: "Past due" },
  { value: "paused",    label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired",   label: "Expired" },
];

const SORT_OPTIONS: { value: SubscriptionSortBy; label: string }[] = [
  { value: "newest",      label: "Newest first" },
  { value: "oldest",      label: "Oldest first" },
  { value: "ending_soon", label: "Ending soon" },
];

export function SubscriptionsFilterBar({
  search, onSearchChange,
  status, onStatusChange,
  sortBy, onSortByChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  status: SubscriptionStatusFilter; onStatusChange: (value: SubscriptionStatusFilter) => void;
  sortBy: SubscriptionSortBy; onSortByChange: (value: SubscriptionSortBy) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-64 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as SubscriptionStatusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Sort by">
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as SubscriptionSortBy)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
