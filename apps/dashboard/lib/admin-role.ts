// lib/utils/admin-role.ts
import { AdminRole as LogAdminRole } from "@/models/admin-log";

export function getAdminRole(role: string): LogAdminRole | null {
  switch (role) {
    case "super_admin": return LogAdminRole.SUPER_ADMIN;
    case "admin":       return LogAdminRole.ADMIN;
    case "support":     return LogAdminRole.SUPPORT;
    default:            return null;
  }
}