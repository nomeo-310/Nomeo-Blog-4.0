"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import { DateRangeFilter } from "@/components/features/date-range-filter";
import type { PaymentStatusFilter, PaymentSortBy } from "../types";

const STATUS_OPTIONS: { value: PaymentStatusFilter; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "success",   label: "Success" },
  { value: "pending",   label: "Pending" },
  { value: "failed",    label: "Failed" },
  { value: "abandoned", label: "Abandoned" },
  { value: "reversed",  label: "Reversed" },
];

const SORT_OPTIONS: { value: PaymentSortBy; label: string }[] = [
  { value: "newest",      label: "Newest first" },
  { value: "oldest",      label: "Oldest first" },
  { value: "amount_high", label: "Highest amount" },
  { value: "amount_low",  label: "Lowest amount" },
];

export function PaymentsFilterBar({
  search, onSearchChange,
  status, onStatusChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  sortBy, onSortByChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  status: PaymentStatusFilter; onStatusChange: (value: PaymentStatusFilter) => void;
  dateFrom: string; onDateFromChange: (value: string) => void;
  dateTo: string; onDateToChange: (value: string) => void;
  sortBy: PaymentSortBy; onSortByChange: (value: PaymentSortBy) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-56 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by reference, name, or email…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as PaymentStatusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Date range">
        <DateRangeFilter
          dateFrom={dateFrom} dateTo={dateTo}
          onChange={(from, to) => { onDateFromChange(from); onDateToChange(to); }}
        />
      </FilterField>

      <FilterField label="Sort by">
        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as PaymentSortBy)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
