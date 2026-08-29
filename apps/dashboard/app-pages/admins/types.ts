export type AdminRoleFilter   = "all" | "support" | "admin" | "super_admin";
export type AdminStatusFilter = "all" | "active" | "suspended" | "inactive";
export type Department = "content" | "trust_and_safety" | "growth" | "engineering" | "support" | "other";

export interface PersonRef {
  id:    string;
  name:  string;
  email: string;
}

export interface AdminStats {
  bansIssued: number;
  bansLifted: number;
  postsRemoved: number;
  postsRestored: number;
  commentsRemoved: number;
  warningsIssued: number;
  campaignsSent: number;
  loungeSuspended: number;
  creatorsApproved: number;
  creatorsRejected: number;
}

export interface AdminListItem {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  role: string;
  adminStatus: string;
  isActive: boolean;
  isOnboarded: boolean;
  department: string;
  loginCount: number;
  lastLoginAt: string | null;
  stats: AdminStats;
  createdAt: string;
}

export interface AdminsListResponse {
  filters: { role: string; adminStatus: string; search?: string };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  admins: AdminListItem[];
}

export interface RecentAction {
  id: string;
  action: string;
  details: string;
  adminName: string;
  severity: string;
  status: string;
  reason?: string;
  createdAt: string;
}

export interface AdminDetailResponse {
  admin: {
    id: string;
    name: string;
    displayName?: string;
    email: string;
    role: string;
    adminStatus: string;
    isActive: boolean;
    isOnboarded: boolean;
    department: string;
    internalNotes?: string;
    permissions: Record<string, boolean>;
    stats: AdminStats;
    dashboardNotifications: Record<string, boolean>;
    suspendedAt?: string;
    suspensionReason?: string;
    loginCount: number;
    lastLoginAt?: string | null;
    lastLoginIP?: string | null;
    createdAt: string;
  };
  recentActions: RecentAction[];
}

export interface NewAdminCredentials {
  id: string;
  email: string;
  name: string;
  displayName: string;
  role: string;
  tempPassword: string;
  seedPhrase: string;
}
