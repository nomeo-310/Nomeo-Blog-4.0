"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type { SubscriberStatusFilter, SubscriberSourceFilter } from "../types";

const STATUS_OPTIONS: { value: SubscriberStatusFilter; label: string }[] = [
  { value: "all",          label: "All statuses" },
  { value: "confirmed",    label: "Confirmed" },
  { value: "unconfirmed",  label: "Unconfirmed" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

const SOURCE_OPTIONS: { value: SubscriberSourceFilter; label: string }[] = [
  { value: "all",          label: "All sources" },
  { value: "landing_form", label: "Landing form" },
  { value: "footer_form",  label: "Footer form" },
  { value: "onboarding",   label: "Onboarding" },
  { value: "import",       label: "Import" },
];

export function SubscribersFilterBar({
  search, onSearchChange,
  status, onStatusChange,
  source, onSourceChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  status: SubscriberStatusFilter; onStatusChange: (value: SubscriberStatusFilter) => void;
  source: SubscriberSourceFilter; onSourceChange: (value: SubscriberSourceFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-64 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by email or name…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as SubscriberStatusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Source">
        <Select value={source} onValueChange={(v) => onSourceChange(v as SubscriberSourceFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SOURCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
