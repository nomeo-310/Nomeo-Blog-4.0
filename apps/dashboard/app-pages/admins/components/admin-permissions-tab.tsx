"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useUpdatePermissions } from "../use-admin-mutations";
import { humanizePermission } from "../utils";
import type { AdminDetailResponse } from "../types";

export function AdminPermissionsTab({
  data, canEdit,
}: {
  data: AdminDetailResponse;
  canEdit: boolean;
}) {
  const { admin } = data;
  const [draft, setDraft] = useState<Record<string, boolean>>(admin.permissions);
  const updatePermissions = useUpdatePermissions(admin.id);

  const isDirty = Object.keys(draft).some((key) => draft[key] !== admin.permissions[key]);

  return (
    <div className="space-y-4">
      {!canEdit && (
        <p className="text-xs text-muted-foreground">Only a super admin can change permissions.</p>
      )}
      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {Object.keys(admin.permissions).sort().map((key) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm text-foreground">{humanizePermission(key)}</span>
            <Switch
              checked={draft[key]}
              onCheckedChange={(checked) => setDraft((d) => ({ ...d, [key]: checked }))}
              disabled={!canEdit || updatePermissions.isPending}
            />
          </label>
        ))}
      </div>
      {canEdit && (
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button" size="sm" variant="outline" className="rounded-full"
            disabled={!isDirty || updatePermissions.isPending}
            onClick={() => setDraft(admin.permissions)}
          >
            Reset
          </Button>
          <Button
            type="button" size="sm" className="rounded-full"
            disabled={!isDirty || updatePermissions.isPending}
            onClick={() => updatePermissions.mutate(draft)}
          >
            Save permissions
          </Button>
        </div>
      )}
    </div>
  );
}
