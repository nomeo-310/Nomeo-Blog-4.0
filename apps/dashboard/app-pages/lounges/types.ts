export type LoungeKindFilter   = "all" | "creator" | "platform";
export type LoungeStatusFilter = "all" | "active" | "closed" | "suspended";
export type LoungeAccessTypeFilter = "all" | "subscribers" | "authenticated";
export type LoungeSortBy = "newest" | "oldest" | "most_members" | "most_messages";

export interface PersonRef {
  id:    string;
  name:  string;
  email: string;
}

export interface LoungeListItem {
  id: string;
  name: string;
  kind: string;
  accessType: string;
  status: string;
  isSuspended: boolean;
  isMuted: boolean;
  creator: PersonRef | null;
  membersCount: number;
  messagesCount: number;
  bannedMembersCount: number;
  pendingReportsCount: number;
  createdAt: string;
}

export interface LoungesListResponse {
  filters: {
    kind: string; status: string; accessType: string;
    hasOpenReports: boolean; search?: string;
  };
  sortBy: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  lounges: LoungeListItem[];
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

export interface LoungeDetailResponse {
  lounge: {
    id: string; name: string; description?: string;
    kind: string; accessType: string;
    creator: PersonRef | null;
    status: string; isMuted: boolean; isSuspended: boolean;
    suspendedBy: PersonRef | null; suspendedAt?: string; suspensionReason?: string;
    rules: string[];
    slowModeSeconds: number; maxMessageLength: number;
    membersCount: number; messagesCount: number;
    bannedMembers: PersonRef[];
    createdAt: string; updatedAt: string;
  };
  memberStats: Record<string, number>;
  recentActions: RecentAction[];
}

export interface LoungeMessageItem {
  id: string;
  author: PersonRef;
  replyToId: string | null;
  body: string;
  deliveryStatus: string;
  isEdited: boolean;
  isRemoved: boolean;
  isDeletedByAuthor: boolean;
  isSystemMessage: boolean;
  reactions: Record<string, number>;
  pendingReportsCount: number;
  createdAt: string;
}

export interface LoungeMessagesResponse {
  loungeId: string;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  messages: LoungeMessageItem[];
}

export interface LoungeReportItem {
  messageId: string;
  messageBody: string;
  reportId: string;
  reason: string;
  details?: string;
  reportedBy: PersonRef;
  reportedAt: string;
  reviewed: boolean;
  reviewedBy: PersonRef | null;
  reviewedAt?: string;
}

export interface LoungeReportsResponse {
  loungeId: string;
  reports: LoungeReportItem[];
}

export interface LoungeMemberItem {
  id: string;
  user: PersonRef;
  status: string;
  role: string;
  isBanned: boolean;
  isSilenced: boolean;
  notificationsMuted: boolean;
  requestedAt: string;
  respondedAt?: string;
  lastMessageAt?: string;
}

export interface LoungeMembersResponse {
  loungeId: string;
  filters: { status: string };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  members: LoungeMemberItem[];
}
