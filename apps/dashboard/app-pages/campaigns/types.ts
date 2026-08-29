export type CampaignStatusFilter = "all" | "draft" | "sending" | "completed" | "failed" | "cancelled";
export type CampaignTypeFilter = "all" | "newsletter" | "announcement" | "promotion";

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface CampaignListItem {
  id: string;
  title: string;
  subject: string;
  type: string;
  status: string;
  recipients: { total: number; successful: number; failed: number; opened: number; clicked: number };
  hasExternalRecipients: boolean;
  createdBy: PersonRef;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface CampaignsListResponse {
  filters: { status: string; type: string; search?: string };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  campaigns: CampaignListItem[];
}

export interface EmailLogItem {
  id: string;
  email: string;
  name: string | null;
  recipientType: "subscriber" | "external";
  status: string;
  sentAt: string | null;
  error: string | null;
}

export interface CampaignDetailResponse {
  campaign: {
    id: string;
    title: string;
    subject: string;
    content: string;
    type: string;
    status: string;
    filters: { status?: string[]; subscribedAfter?: string } | null;
    externalRecipients: Array<{ email: string; name?: string }>;
    hasExternalRecipients: boolean;
    recipients: { total: number; successful: number; failed: number; opened: number; clicked: number };
    scheduledFor: string | null;
    sentAt: string | null;
    createdBy: PersonRef | null;
    createdAt: string;
  };
  recentLogs: EmailLogItem[];
}
