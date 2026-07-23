import * as React from "react";
import { EmailLayout, Heading, Paragraph, CtaButton, SectionTitle, HelpBlock, BRAND } from "./components";

/**
 * UserUnbanEmail — sent when an admin lifts a ban.
 */
export default function UserUnbanEmail({
  name = "there",
  unbannedBy = "the Nomeo moderation team",
  note,
}: {
  name?: string;
  unbannedBy?: string;
  /** Optional admin note explaining reinstatement */
  note?: string;
}) {
  return (
    <EmailLayout preview="Your Nomeo account has been reinstated">
      <Heading>Your account has been reinstated</Heading>

      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Good news — your Nomeo account has been reinstated by {unbannedBy}. You can now sign in
        and access all features as normal.
      </Paragraph>

      {note && (
        <>
          <SectionTitle>Note from the team</SectionTitle>
          <Paragraph>{note}</Paragraph>
        </>
      )}

      <SectionTitle>A reminder</SectionTitle>
      <Paragraph>
        Please review our{" "}
        <a href={`${BRAND.url}/guidelines`} style={{ color: "#2563eb" }}>
          Community Guidelines
        </a>{" "}
        before continuing. Repeat violations may result in a permanent ban.
      </Paragraph>

      <CtaButton href={`${BRAND.url}/sign-in`}>Sign back in</CtaButton>

      <HelpBlock />
    </EmailLayout>
  );
}