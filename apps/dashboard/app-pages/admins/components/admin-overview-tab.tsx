"use client";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ReasonActionButton } from "@/components/features/reason-action-button";
import { DeleteConfirmPanel } from "@/components/features/delete-confirm-panel";
import { AdminRoleBadge, AdminStatusBadge, PendingSetupBadge } from "./admin-badges";
import { useUpdateRole, useSuspendAdmin, useActivateAdmin, useDeleteAdmin } from "../use-admin-mutations";
import { formatCompactNumber, formatDateTime, titleCase } from "../utils";
import type { AdminDetailResponse } from "../types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-heading text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function AdminOverviewTab({
  data, isSuperAdmin, isSelf, onClose,
}: {
  data: AdminDetailResponse;
  isSuperAdmin: boolean;
  isSelf: boolean;
  onClose: () => void;
}) {
  const { admin, recentActions } = data;
  const updateRole = useUpdateRole(admin.id);
  const suspend     = useSuspendAdmin(admin.id);
  const activate    = useActivateAdmin(admin.id);
  const remove      = useDeleteAdmin(admin.id, onClose);

  const canManage = isSuperAdmin && !isSelf;

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-1.5">
        <AdminRoleBadge role={admin.role} />
        {!admin.isActive && !admin.isOnboarded
          ? <PendingSetupBadge />
          : <AdminStatusBadge status={admin.adminStatus} />}
      </div>

      {!admin.isActive && !admin.isOnboarded && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          This admin hasn&apos;t logged in yet. They were emailed a temporary password and seed phrase — their status will flip to active once they complete first-login setup.
        </div>
      )}

      {admin.adminStatus === "suspended" && admin.suspensionReason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Suspended on {formatDateTime(admin.suspendedAt)}: {admin.suspensionReason}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 sm:grid-cols-4">
        <StatBlock label="Bans issued" value={formatCompactNumber(admin.stats.bansIssued)} />
        <StatBlock label="Posts removed" value={formatCompactNumber(admin.stats.postsRemoved)} />
        <StatBlock label="Warnings issued" value={formatCompactNumber(admin.stats.warningsIssued)} />
        <StatBlock label="Logins" value={formatCompactNumber(admin.loginCount)} />
      </div>

      {/* Details */}
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Department</p>
          <p className="font-medium text-foreground">{titleCase(admin.department)}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">Last login</p>
          <p className="font-medium text-foreground">{formatDateTime(admin.lastLoginAt)}</p>
          {admin.lastLoginIP && <p className="text-xs text-muted-foreground">{admin.lastLoginIP}</p>}
        </div>
      </div>

      {/* Role */}
      {canManage && (
        <div className="space-y-1.5">
          <Label htmlFor="admin-role-select">Role</Label>
          <Select
            value={admin.role}
            onValueChange={(role) => { if (role && role !== admin.role) updateRole.mutate({ role }); }}
          >
            <SelectTrigger id="admin-role-select" className="w-56" disabled={updateRole.isPending}><SelectValue /></SelectTrigger>
            <SelectContent className="p-1">
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="super_admin">Super admin</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Changing role resets this admin&apos;s permissions to the new role&apos;s defaults.</p>
        </div>
      )}

      {/* Moderation actions */}
      {canManage && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Access</h3>
          <div className="flex flex-wrap items-start gap-2">
            {admin.adminStatus === "suspended" ? (
              <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={activate.isPending} onClick={() => activate.mutate()}>
                Reactivate
              </Button>
            ) : (
              <ReasonActionButton
                label="Suspend" variant="destructive" isLoading={suspend.isPending}
                onConfirm={(reason) => suspend.mutate({ reason: reason! })}
              />
            )}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {canManage && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-destructive">Danger zone</h3>
          <DeleteConfirmPanel
            confirmValue={admin.email}
            warning="This permanently removes this admin's dashboard access. Their platform user account is not deleted. This cannot be undone."
            isLoading={remove.isPending}
            onConfirm={({ reason, confirmValue }) => remove.mutate({ reason, confirmEmail: confirmValue })}
          />
        </div>
      )}

      {/* Recent history */}
      {recentActions.length > 0 && (
        <div>
          <h3 className="mb-3 font-heading text-sm font-semibold text-foreground">Recent history</h3>
          <ul className="space-y-2">
            {recentActions.map((a) => (
              <li key={a.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{titleCase(a.action)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">by {a.adminName}{a.reason ? ` — ${a.reason}` : ""}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
