export type ApplicationStatusFilter = "pending" | "approved" | "rejected" | "all";

export interface PersonRef {
  id:    string;
  name:  string;
  email: string;
}

export interface ApplicationListItem {
  id: string;
  applicant: PersonRef;
  writingTopics: string;
  motivation: string;
  portfolioLinks: string;
  sampleContent: string;
  status: string;
  reviewedBy: PersonRef | null;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ApplicationsListResponse {
  filters: { status: string };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  applications: ApplicationListItem[];
}
