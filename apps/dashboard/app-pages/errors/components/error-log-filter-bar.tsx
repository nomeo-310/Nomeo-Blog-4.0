"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type { ErrorSourceFilter, ErrorSeverityFilter, ErrorResolvedFilter } from "../types";
import { titleCase } from "../utils";

const SOURCE_OPTIONS: { value: ErrorSourceFilter; label: string }[] = [
  { value: "all", label: "All sources" },
  ...(["frontend", "backend", "background_job", "webhook"] as const).map((v) => ({ value: v, label: titleCase(v) })),
];

const SEVERITY_OPTIONS: { value: ErrorSeverityFilter; label: string }[] = [
  { value: "all",      label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "error",    label: "Error" },
  { value: "warning",  label: "Warning" },
  { value: "info",     label: "Info" },
];

const RESOLVED_OPTIONS: { value: ErrorResolvedFilter; label: string }[] = [
  { value: "unresolved", label: "Unresolved" },
  { value: "resolved",   label: "Resolved" },
  { value: "all",        label: "All" },
];

export function ErrorLogFilterBar({
  search, onSearchChange,
  source, onSourceChange,
  severity, onSeverityChange,
  resolved, onResolvedChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  source: ErrorSourceFilter; onSourceChange: (value: ErrorSourceFilter) => void;
  severity: ErrorSeverityFilter; onSeverityChange: (value: ErrorSeverityFilter) => void;
  resolved: ErrorResolvedFilter; onResolvedChange: (value: ErrorResolvedFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 p-4">
      <FilterField label="Search" className="min-w-56 flex-1">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by error code, message, or URL…"
            className="pl-9"
          />
        </div>
      </FilterField>

      <FilterField label="Status">
        <Select value={resolved} onValueChange={(v) => onResolvedChange(v as ErrorResolvedFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {RESOLVED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Severity">
        <Select value={severity} onValueChange={(v) => onSeverityChange(v as ErrorSeverityFilter)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SEVERITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Source">
        <Select value={source} onValueChange={(v) => onSourceChange(v as ErrorSourceFilter)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {SOURCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
