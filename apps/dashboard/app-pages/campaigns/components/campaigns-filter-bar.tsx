"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type { CampaignStatusFilter, CampaignTypeFilter } from "../types";

const STATUS_OPTIONS: { value: CampaignStatusFilter; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "draft",     label: "Draft" },
  { value: "sending",   label: "Sending" },
  { value: "completed", label: "Completed" },
  { value: "failed",    label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS: { value: CampaignTypeFilter; label: string }[] = [
  { value: "all",          label: "All types" },
  { value: "newsletter",   label: "Newsletter" },
  { value: "announcement", label: "Announcement" },
  { value: "promotion",    label: "Promotion" },
];

export function CampaignsFilterBar({
  search, onSearchChange,
  status, onStatusChange,
  type, onTypeChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  status: CampaignStatusFilter; onStatusChange: (value: CampaignStatusFilter) => void;
  type: CampaignTypeFilter; onTypeChange: (value: CampaignTypeFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-56 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title or subject…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as CampaignStatusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Type">
        <Select value={type} onValueChange={(v) => onTypeChange(v as CampaignTypeFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
