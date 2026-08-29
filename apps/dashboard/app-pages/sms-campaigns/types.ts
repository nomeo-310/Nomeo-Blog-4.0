export type SmsCampaignStatusFilter = "all" | "draft" | "sending" | "completed" | "failed" | "cancelled";
export type SmsAudienceFilter = "subscribers" | "external" | "both";

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface SmsCampaignListItem {
  id: string;
  title: string;
  message: string;
  audience: string;
  status: string;
  recipients: { total: number; successful: number; failed: number };
  createdBy: PersonRef;
  sentAt: string | null;
  createdAt: string;
}

export interface SmsCampaignsListResponse {
  filters: { status: string; search?: string };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  campaigns: SmsCampaignListItem[];
}

export interface SmsLogItem {
  id: string;
  phone: string;
  name: string | null;
  recipientType: "subscriber" | "external";
  status: string;
  sentAt: string | null;
  error: string | null;
}

export interface SmsCampaignDetailResponse {
  campaign: {
    id: string;
    title: string;
    message: string;
    audience: string;
    status: string;
    externalRecipients: Array<{ phone: string; name?: string }>;
    recipients: { total: number; successful: number; failed: number };
    sentAt: string | null;
    createdBy: PersonRef | null;
    createdAt: string;
  };
  recentLogs: SmsLogItem[];
}
