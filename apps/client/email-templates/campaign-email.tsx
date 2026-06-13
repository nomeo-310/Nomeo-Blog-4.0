import { Section } from "@react-email/components";
import { EmailLayout, Heading, CtaButton } from "./components";

/**
 * Campaign Email — the shell for admin broadcasts and the platform newsletter.
 * The admin composes `bodyHtml` in the dashboard editor; it is injected into
 * the brand layout. Unsubscribe link is mandatory for this template.
 */

export type campaignEmailProps = {
  heading?: string;
  /** Sanitised HTML from the campaign editor — sanitise server-side before render */
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

export default function CampaignEmail({ heading = "News from Nomeo", bodyHtml = "<p>Campaign body goes here.</p>", ctaLabel, ctaUrl, unsubscribeUrl = "https://nomeo.com/unsubscribe/token" }: campaignEmailProps) {
  return (
    <EmailLayout preview={heading} unsubscribeUrl={unsubscribeUrl}>
      <Heading>{heading}</Heading>

      <Section
        style={{ fontSize: 15, lineHeight: "24px", color: "#374151" }}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {ctaLabel && ctaUrl && <CtaButton href={ctaUrl}>{ctaLabel}</CtaButton>}
    </EmailLayout>
  );
}