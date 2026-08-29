"use client";

import { Search } from "lucide-react";
import { Input }  from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FilterField } from "@/components/features/filter-field";
import type { AdminRoleFilter, AdminStatusFilter } from "../types";

const ROLE_OPTIONS: { value: AdminRoleFilter; label: string }[] = [
  { value: "all",         label: "All roles" },
  { value: "support",     label: "Support" },
  { value: "admin",       label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

const STATUS_OPTIONS: { value: AdminStatusFilter; label: string }[] = [
  { value: "all",       label: "All statuses" },
  { value: "active",    label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive",  label: "Inactive" },
];

export function AdminsFilterBar({
  search, onSearchChange,
  role, onRoleChange,
  adminStatus, onAdminStatusChange,
}: {
  search: string; onSearchChange: (value: string) => void;
  role: AdminRoleFilter; onRoleChange: (value: AdminRoleFilter) => void;
  adminStatus: AdminStatusFilter; onAdminStatusChange: (value: AdminStatusFilter) => void;
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

      <FilterField label="Role">
        <Select value={role} onValueChange={(v) => onRoleChange(v as AdminRoleFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label="Status">
        <Select value={adminStatus} onValueChange={(v) => onAdminStatusChange(v as AdminStatusFilter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="p-1">
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}
