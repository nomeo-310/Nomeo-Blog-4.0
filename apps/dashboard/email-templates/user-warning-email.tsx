import * as React from "react";
import { EmailLayout, Heading, Paragraph, Callout, SectionTitle, HelpBlock, BRAND } from "./components";

/**
 * UserWarningEmail — sent when an admin issues a warning short of a ban.
 */
export default function UserWarningEmail({
  name    = "there",
  reason  = "a violation of our community guidelines",
  warnedBy = "the Nomeo moderation team",
}: {
  name?: string;
  reason?: string;
  warnedBy?: string;
}) {
  return (
    <EmailLayout preview="You've received a warning from the Nomeo team">
      <Heading>You&apos;ve received a warning</Heading>

      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        {warnedBy} has issued you a warning regarding your recent activity on Nomeo. Your account
        remains active — no action is required beyond reviewing the note below.
      </Paragraph>

      <SectionTitle>Reason</SectionTitle>
      <Paragraph>{reason}</Paragraph>

      <Callout>
        Further violations may result in a temporary or permanent ban. Please review our{" "}
        <a href={`${BRAND.url}/guidelines`} style={{ color: "#2563eb" }}>
          Community Guidelines
        </a>{" "}
        to avoid this in the future.
      </Callout>

      <HelpBlock />
    </EmailLayout>
  );
}
