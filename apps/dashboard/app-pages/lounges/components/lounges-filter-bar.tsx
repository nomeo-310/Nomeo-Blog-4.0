"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label }  from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type {
  LoungeAccessTypeFilter, LoungeKindFilter, LoungeSortBy, LoungeStatusFilter,
} from "../types";

const KIND_OPTIONS: { value: LoungeKindFilter; label: string }[] = [
  { value: "all",      label: "All kinds" },
  { value: "creator",  label: "Creator" },
  { value: "platform", label: "Platform" },
];

const STATUS_OPTIONS: { value: LoungeStatusFilter; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "active",    label: "Active" },
  { value: "closed",    label: "Closed" },
  { value: "suspended", label: "Suspended" },
];

const ACCESS_TYPE_OPTIONS: { value: LoungeAccessTypeFilter; label: string }[] = [
  { value: "all",           label: "All access types" },
  { value: "subscribers",   label: "Subscribers only" },
  { value: "authenticated", label: "Authenticated" },
];

const SORT_OPTIONS: { value: LoungeSortBy; label: string }[] = [
  { value: "newest",        label: "Newest first" },
  { value: "oldest",        label: "Oldest first" },
  { value: "most_members",  label: "Most members" },
  { value: "most_messages", label: "Most messages" },
];

export function LoungesFilterBar({
  search, onSearchChange,
  kind, onKindChange,
  status, onStatusChange,
  accessType, onAccessTypeChange,
  hasOpenReports, onHasOpenReportsChange,
  sortBy, onSortByChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  kind: LoungeKindFilter; onKindChange: (value: LoungeKindFilter) => void;
  status: LoungeStatusFilter; onStatusChange: (value: LoungeStatusFilter) => void;
  accessType: LoungeAccessTypeFilter; onAccessTypeChange: (value: LoungeAccessTypeFilter) => void;
  hasOpenReports: boolean; onHasOpenReportsChange: (value: boolean) => void;
  sortBy: LoungeSortBy; onSortByChange: (value: LoungeSortBy) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-64 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Kind">
        <Select value={kind} onValueChange={(v) => onKindChange(v as LoungeKindFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as LoungeStatusFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Access type">
        <Select value={accessType} onValueChange={(v) => onAccessTypeChange(v as LoungeAccessTypeFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {ACCESS_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Sort by">
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as LoungeSortBy)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Reports">
        <div className="flex h-9 items-center gap-2">
          <Switch id="lounge-open-reports" checked={hasOpenReports} onCheckedChange={onHasOpenReportsChange} />
          <Label htmlFor="lounge-open-reports" className="cursor-pointer text-sm normal-case">Open reports only</Label>
        </div>
      </FilterField>
    </div>
  );
}
