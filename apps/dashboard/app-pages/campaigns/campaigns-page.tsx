"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmailCampaignsSection } from "./email-campaigns-section";
import { SmsCampaignsSection } from "@/app-pages/sms-campaigns/sms-campaigns-section";

type PageTab = "email" | "sms";

export default function CampaignsPage() {
  const [pageTab, setPageTab] = useState<PageTab>("email");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Campaigns</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Send email and SMS campaigns to subscribers and external recipients.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {([
          { key: "email", label: "Email" },
          { key: "sms",   label: "SMS" },
        ] as { key: PageTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setPageTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              pageTab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pageTab === "email" ? <EmailCampaignsSection /> : <SmsCampaignsSection />}
    </div>
  );
}
