import * as React from "react";
import {
  EmailLayout, Heading, Paragraph, CtaButton, Divider, BRAND,
} from "./components";
import { Section, Text, Html } from "@react-email/components";

/**
 * CampaignEmail — admin-sent platform-wide announcement or newsletter.
 * bodyHtml is sanitised server-side before being passed here.
 */
export default function CampaignEmail({
  heading        = "A message from Nomeo",
  bodyHtml       = "",
  ctaLabel,
  ctaUrl,
  unsubscribeUrl = `${BRAND.url}/newsletter/unsubscribe`,
  subscriberName,
}: {
  heading?:        string;
  bodyHtml?:       string;
  ctaLabel?:       string;
  ctaUrl?:         string;
  unsubscribeUrl?: string;
  subscriberName?: string;
}) {
  return (
    <EmailLayout preview={heading} unsubscribeUrl={unsubscribeUrl}>
      {subscriberName && (
        <Paragraph>Hi {subscriberName},</Paragraph>
      )}

      <Heading>{heading}</Heading>

      {/* Render sanitised HTML body — react-email renders this in an iframe-safe way */}
      <Section
        style={{ color: "#374151", fontSize: 15, lineHeight: "1.6" }}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {ctaLabel && ctaUrl && (
        <>
          <Divider />
          <CtaButton href={ctaUrl}>{ctaLabel}</CtaButton>
        </>
      )}

      <Divider />

      <Text style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" as const }}>
        You received this because you subscribed to Nomeo updates.{" "}
        <a href={unsubscribeUrl} style={{ color: "#6b7280" }}>
          Unsubscribe
        </a>
      </Text>
    </EmailLayout>
  );
}