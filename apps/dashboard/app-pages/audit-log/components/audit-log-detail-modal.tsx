"use client";

import type { ReactNode } from "react";
import Modal from "@/components/ui/modal";
import { AuditSeverityBadge, AuditStatusBadge } from "./audit-log-badges";
import { formatDateTime, titleCase } from "../utils";
import type { AuditLogItem } from "../types";

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function AuditLogDetailModal({ log, onClose }: { log: AuditLogItem | null; onClose: () => void }) {
  return (
    <Modal
      isOpen={!!log}
      onClose={onClose}
      size="lg"
      title={log ? titleCase(log.action) : "Audit entry"}
      description={log?.details}
    >
      {log && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <AuditSeverityBadge severity={log.severity} />
            <AuditStatusBadge status={log.status} />
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{titleCase(log.actionCategory)}</span>
          </div>

          <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <InfoRow label="Admin" value={`${log.adminName} (${log.adminEmail})`} />
            <InfoRow label="Admin role" value={titleCase(log.adminRole)} />
            <InfoRow label="Target" value={log.targetType ? `${titleCase(log.targetType)}${log.targetName ? ` · ${log.targetName}` : ""}` : "—"} />
            <InfoRow label="Affected count" value={log.affectedCount ?? "—"} />
            <InfoRow label="IP address" value={log.ipAddress} />
            <InfoRow label="Endpoint" value={log.endpoint ? `${log.method ?? ""} ${log.endpoint}`.trim() : "—"} />
          </div>

          {log.reason && (
            <div>
              <h3 className="mb-1.5 font-heading text-sm font-semibold text-foreground">Reason given</h3>
              <p className="rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">{log.reason}</p>
            </div>
          )}

          {log.errorMessage && (
            <div>
              <h3 className="mb-1.5 font-heading text-sm font-semibold text-foreground">Error</h3>
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{log.errorMessage}</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {formatDateTime(log.createdAt)}
            {log.reversible && log.revertedAt && ` · Reverted ${formatDateTime(log.revertedAt)}`}
          </p>
        </div>
      )}
    </Modal>
  );
}
