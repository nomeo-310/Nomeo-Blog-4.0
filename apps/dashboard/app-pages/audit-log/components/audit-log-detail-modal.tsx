"use client";

import type { ReactNode } from "react";
import Modal from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { AuditSeverityBadge, AuditStatusBadge } from "./audit-log-badges";
import { formatDateTime, titleCase } from "../utils";
import type { AuditLogItem } from "../types";

const METHOD_STYLES: Record<string, string> = {
  GET:    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  POST:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PATCH:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PUT:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-destructive/10 text-destructive",
};

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="wrap-break-word text-sm text-foreground">{value}</p>
    </div>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 rounded-xl border border-border p-3", className)}>{children}</div>;
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
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <AuditSeverityBadge severity={log.severity} />
            <AuditStatusBadge status={log.status} />
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{titleCase(log.actionCategory)}</span>
            {log.reversible && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {log.revertedAt ? `Reverted ${formatDateTime(log.revertedAt)}` : "Reversible"}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <Field label="Admin" value={log.adminName} />
              <p className="mt-0.5 wrap-break-word text-xs text-muted-foreground">{log.adminEmail}</p>
              <p className="mt-2 text-xs text-muted-foreground">{titleCase(log.adminRole)}</p>
            </Card>
            <Card>
              <Field
                label="Target"
                value={log.targetType ? titleCase(log.targetType) : "—"}
              />
              {log.targetName && <p className="mt-0.5 wrap-break-word text-xs text-muted-foreground">{log.targetName}</p>}
              {log.affectedCount != null && (
                <p className="mt-2 text-xs text-muted-foreground">{log.affectedCount} affected</p>
              )}
            </Card>
          </div>

          {/* Request context — method + path are shown as a wrapping code block since
              endpoint paths embed 24-char ObjectIds with no natural break points and
              would otherwise overflow a narrow grid cell instead of wrapping. */}
          <Card className="space-y-2">
            <p className="text-xs text-muted-foreground">Request</p>
            <div className="flex flex-wrap items-start gap-2">
              {log.method && (
                <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", METHOD_STYLES[log.method] ?? "bg-muted text-muted-foreground")}>
                  {log.method}
                </span>
              )}
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
                {log.endpoint ?? "—"}
              </code>
            </div>
            <p className="border-t border-border pt-2 font-mono text-xs text-muted-foreground">IP {log.ipAddress}</p>
          </Card>

          {log.reason && (
            <div>
              <h3 className="mb-1.5 font-heading text-sm font-semibold text-foreground">Reason given</h3>
              <p className="wrap-break-word rounded-xl border border-border bg-muted/30 p-3 text-sm text-foreground">{log.reason}</p>
            </div>
          )}

          {log.errorMessage && (
            <div>
              <h3 className="mb-1.5 font-heading text-sm font-semibold text-foreground">Error</h3>
              <p className="wrap-break-word rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{log.errorMessage}</p>
            </div>
          )}

          <p className="border-t border-border pt-3 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
        </div>
      )}
    </Modal>
  );
}
