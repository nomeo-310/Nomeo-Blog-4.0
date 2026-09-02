export type ErrorSourceFilter = "all" | "frontend" | "backend" | "background_job" | "webhook";
export type ErrorSeverityFilter = "all" | "critical" | "error" | "warning" | "info";
export type ErrorResolvedFilter = "unresolved" | "resolved" | "all";

export interface ErrorLogItem {
  id: string;
  source: string;
  severity: string;
  errorCode: string;
  message: string;
  stack: string | null;
  url: string | null;
  httpMethod: string | null;
  httpStatus: number | null;
  userId: string | null;
  userRole: string | null;
  clientContext: {
    userAgent?: string;
    browser?: string;
    os?: string;
    screenSize?: string;
  } | null;
  serverContext: {
    nodeVersion?: string;
    hostname?: string;
    memoryUsageMb?: number;
    jobName?: string;
  } | null;
  isResolved: boolean;
  resolvedAt: string | null;
  resolutionNote: string | null;
  occurrenceCount: number;
  lastOccurredAt: string;
  createdAt: string;
}

export interface ErrorLogListResponse {
  filters: {
    source: string;
    severity: string;
    resolved: string;
    search?: string;
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  unresolvedCount: number;
  logs: ErrorLogItem[];
}
