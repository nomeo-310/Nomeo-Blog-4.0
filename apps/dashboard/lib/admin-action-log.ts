import { AdminLog, AdminAction, AdminLogSeverity, AdminRole, type TargetType } from "@/models/admin-log";
import type { CurrentUser } from "@/lib/session";

function resolveAdminRole(admin: CurrentUser): AdminRole {
  if (admin.isSuperAdmin) return AdminRole.SUPER_ADMIN;
  if (admin.isAnAdmin)    return AdminRole.ADMIN;
  return AdminRole.SUPPORT;
}

function clientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Writes an AdminLog entry for a mutating admin-dashboard action, filling in the
 * admin identity, request IP, and endpoint automatically so route handlers only
 * need to describe what happened.
 */
export async function logAdminAction(
  req: Request,
  admin: CurrentUser,
  params: {
    action:      AdminAction;
    details:     string;
    targetType?: TargetType;
    targetId?:   string;
    targetName?: string;
    reason?:     string;
    status?:     "success" | "failed" | "partial";
    severity?:   AdminLogSeverity;
    reversible?: boolean;
    metadata?:   Record<string, unknown>;
  }
): Promise<void> {
  const url = new URL(req.url);
  await AdminLog.logAction({
    adminId:    admin.adminId,
    adminEmail: admin.email,
    adminName:  admin.displayName || admin.name,
    adminRole:  resolveAdminRole(admin),
    ipAddress:  clientIp(req),
    endpoint:   url.pathname,
    method:     req.method,
    ...params,
  });
}
