"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ErrorSeverityBadge, ErrorSourceBadge, ErrorResolvedBadge } from "./error-log-badges";
import { useResolveError, useReopenError } from "../use-error-log-mutations";
import { formatDateTime, titleCase } from "../utils";
import type { ErrorLogItem } from "../types";

const METHOD_STYLES: Record<string, string> = {
  GET:    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  POST:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PATCH:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PUT:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-destructive/10 text-destructive",
};

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0 rounded-xl border border-border p-3", className)}>{children}</div>;
}

function ResolvePanel({ errorId }: { errorId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const resolve = useResolveError(errorId);

  if (!expanded) {
    return (
      <Button type="button" size="sm" className="rounded-full" onClick={() => setExpanded(true)}>
        Mark resolved
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-xl border border-border p-3">
      <Textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resolution note (optional) — what fixed it, or why it's safe to close…"
        className="min-h-16 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" className="rounded-full" disabled={resolve.isPending} onClick={() => { setExpanded(false); setNote(""); }}>
          Cancel
        </Button>
        <Button
          type="button" size="sm" className="rounded-full"
          disabled={resolve.isPending}
          onClick={() => resolve.mutate(note.trim(), { onSuccess: () => setExpanded(false) })}
        >
          {resolve.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm resolved"}
        </Button>
      </div>
    </div>
  );
}

export function ErrorLogDetailModal({ error, onClose }: { error: ErrorLogItem | null; onClose: () => void }) {
  const reopen = useReopenError(error?.id ?? "");

  const clientContext = error?.clientContext;
  const serverContext = error?.serverContext;
  const hasClientContext = !!clientContext && Object.values(clientContext).some(Boolean);
  const hasServerContext = !!serverContext && Object.values(serverContext).some(Boolean);

  return (
    <Modal
      isOpen={!!error}
      onClose={onClose}
      size="lg"
      title={error ? titleCase(error.errorCode) : "Error"}
      description={error?.message}
    >
      {error && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">{error.errorCode}</code>
            <ErrorSeverityBadge severity={error.severity} />
            <ErrorSourceBadge source={error.source} />
            <ErrorResolvedBadge isResolved={error.isResolved} />
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {error.occurrenceCount} occurrence{error.occurrenceCount === 1 ? "" : "s"}
            </span>
          </div>

          {(error.url || error.httpMethod) && (
            <Card className="space-y-2">
              <p className="text-xs text-muted-foreground">Where it happened</p>
              <div className="flex flex-wrap items-start gap-2">
                {error.httpMethod && (
                  <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold", METHOD_STYLES[error.httpMethod] ?? "bg-muted text-muted-foreground")}>
                    {error.httpMethod}
                  </span>
                )}
                {error.httpStatus != null && (
                  <span className="shrink-0 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">
                    {error.httpStatus}
                  </span>
                )}
                <code className="min-w-0 flex-1 wrap-break-word font-mono text-xs text-foreground">
                  {error.url ?? "—"}
                </code>
              </div>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <p className="text-xs text-muted-foreground">User</p>
              <p className="mt-0.5 wrap-break-word text-sm text-foreground">
                {error.userId ? titleCase(error.userRole ?? "user") : "Unauthenticated"}
              </p>
              {error.userId && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{error.userId}</p>}
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Seen</p>
              <p className="mt-0.5 text-sm text-foreground">First {formatDateTime(error.createdAt)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Last {formatDateTime(error.lastOccurredAt)}</p>
            </Card>
          </div>

          {(hasClientContext || hasServerContext) && (
            <Card className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{error.source === "frontend" ? "Client context" : "Server context"}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {hasClientContext && clientContext && Object.entries(clientContext)
                  .filter(([, v]) => Boolean(v))
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{titleCase(k)}</dt>
                      <dd className="wrap-break-word text-foreground">{String(v)}</dd>
                    </div>
                  ))}
                {hasServerContext && serverContext && Object.entries(serverContext)
                  .filter(([, v]) => Boolean(v))
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{titleCase(k)}</dt>
                      <dd className="wrap-break-word text-foreground">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            </Card>
          )}

          {error.stack && (
            <div>
              <h3 className="mb-1.5 font-heading text-sm font-semibold text-foreground">Stack trace</h3>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-border bg-muted/30 p-3 font-mono text-xs text-foreground">
                {error.stack}
              </pre>
            </div>
          )}

          <div className="border-t border-border pt-4">
            {error.isResolved ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Resolved {formatDateTime(error.resolvedAt)}
                  {error.resolutionNote && ` — ${error.resolutionNote}`}
                </p>
                <Button
                  type="button" size="sm" variant="outline" className="rounded-full"
                  disabled={reopen.isPending}
                  onClick={() => reopen.mutate()}
                >
                  {reopen.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reopen"}
                </Button>
              </div>
            ) : (
              <ResolvePanel errorId={error.id} />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
