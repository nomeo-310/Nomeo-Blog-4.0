export type AuditCategoryFilter =
  | "all"
  | "authentication"
  | "user_management"
  | "creator_management"
  | "post_moderation"
  | "comment_moderation"
  | "lounge_moderation"
  | "advert_management"
  | "subscription_management"
  | "payment_management"
  | "audience_management"
  | "campaign_management"
  | "system_settings"
  | "security"
  | "admin_management";

export type AuditSeverityFilter = "all" | "info" | "warning" | "error" | "critical";
export type AuditStatusFilter = "all" | "success" | "failed" | "partial";

export type AuditTargetTypeFilter =
  | "all"
  | "user"
  | "post"
  | "comment"
  | "lounge"
  | "lounge_message"
  | "plan"
  | "subscription"
  | "payment"
  | "creator_application"
  | "advert"
  | "earning"
  | "follower"
  | "newsletter_subscriber"
  | "campaign"
  | "sms_campaign"
  | "system"
  | "admin";

export interface AuditLogChange {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface AuditLogItem {
  id: string;
  adminName: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  actionCategory: string;
  severity: string;
  details: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  ipAddress: string;
  endpoint: string | null;
  method: string | null;
  reason: string | null;
  status: "success" | "failed" | "partial";
  errorMessage: string | null;
  reversible: boolean;
  revertedAt: string | null;
  affectedCount: number | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  filters: {
    category: string;
    severity: string;
    status: string;
    targetType: string;
    search?: string;
    dateFrom: string | null;
    dateTo: string | null;
  };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  logs: AuditLogItem[];
}
