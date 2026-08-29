"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import { DateRangeFilter } from "@/components/features/date-range-filter";
import type {
  AuditCategoryFilter, AuditSeverityFilter, AuditStatusFilter, AuditTargetTypeFilter,
} from "../types";
import { titleCase } from "../utils";

const CATEGORY_OPTIONS: { value: AuditCategoryFilter; label: string }[] = [
  { value: "all", label: "All categories" },
  ...([
    "authentication", "user_management", "creator_management", "post_moderation",
    "comment_moderation", "lounge_moderation", "advert_management", "subscription_management",
    "payment_management", "audience_management", "campaign_management", "system_settings",
    "security", "admin_management",
  ] as const).map((v) => ({ value: v, label: titleCase(v) })),
];

const SEVERITY_OPTIONS: { value: AuditSeverityFilter; label: string }[] = [
  { value: "all",      label: "All severities" },
  { value: "info",     label: "Info" },
  { value: "warning",  label: "Warning" },
  { value: "error",    label: "Error" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTIONS: { value: AuditStatusFilter; label: string }[] = [
  { value: "all",     label: "All statuses" },
  { value: "success", label: "Success" },
  { value: "failed",  label: "Failed" },
  { value: "partial", label: "Partial" },
];

const TARGET_TYPE_OPTIONS: { value: AuditTargetTypeFilter; label: string }[] = [
  { value: "all", label: "All targets" },
  ...([
    "user", "post", "comment", "lounge", "lounge_message", "plan", "subscription", "payment",
    "creator_application", "advert", "earning", "follower", "newsletter_subscriber", "campaign",
    "sms_campaign", "system", "admin",
  ] as const).map((v) => ({ value: v, label: titleCase(v) })),
];

export function AuditLogFilterBar({
  search, onSearchChange,
  category, onCategoryChange,
  severity, onSeverityChange,
  status, onStatusChange,
  targetType, onTargetTypeChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  category: AuditCategoryFilter; onCategoryChange: (value: AuditCategoryFilter) => void;
  severity: AuditSeverityFilter; onSeverityChange: (value: AuditSeverityFilter) => void;
  status: AuditStatusFilter; onStatusChange: (value: AuditStatusFilter) => void;
  targetType: AuditTargetTypeFilter; onTargetTypeChange: (value: AuditTargetTypeFilter) => void;
  dateFrom: string; onDateFromChange: (value: string) => void;
  dateTo: string; onDateToChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-56 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by admin, target, or details…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Category">
        <Select value={category} onValueChange={(v) => onCategoryChange(v as AuditCategoryFilter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Severity">
        <Select value={severity} onValueChange={(v) => onSeverityChange(v as AuditSeverityFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SEVERITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Status">
        <Select value={status} onValueChange={(v) => onStatusChange(v as AuditStatusFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Target">
        <Select value={targetType} onValueChange={(v) => onTargetTypeChange(v as AuditTargetTypeFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {TARGET_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Date range">
        <DateRangeFilter
          dateFrom={dateFrom} dateTo={dateTo}
          onChange={(from, to) => { onDateFromChange(from); onDateToChange(to); }}
        />
      </FilterField>
    </div>
  );
}
