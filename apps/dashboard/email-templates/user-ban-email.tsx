import * as React from "react";
import {EmailLayout, Heading, Paragraph, Callout, HelpBlock, IconRow, SectionTitle, BRAND,} from "./components";

/**
 * UserBanEmail — sent to a user when their account is banned by an admin.
 * Used for both temporary bans (with duration) and permanent bans.
 */
export default function UserBanEmail({
  name = "there",
  reason = "violation of community guidelines",
  isPermanent = false,
  durationDays,
  bannedBy = "the Nomeo moderation team",
  appealDeadline,
}: {
  name?: string;
  reason?: string;
  isPermanent?: boolean;
  durationDays?: number;
  bannedBy?: string;
  appealDeadline?: string;
}) {
  const title = isPermanent ? "Your account has been permanently banned" : "Your account has been temporarily banned";

  return (
    <EmailLayout preview={title}>
      <Heading>{title}</Heading>

      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        Following a review of your account activity, we have{" "}
        {isPermanent ? "permanently banned" : `temporarily banned (${durationDays ? `${durationDays} days` : "duration pending review"})`}{" "}
        your Nomeo account.
      </Paragraph>

      <SectionTitle>Reason</SectionTitle>
      <Paragraph>{reason}</Paragraph>

      <SectionTitle>Action taken by</SectionTitle>
      <Paragraph>{bannedBy}</Paragraph>

      <Callout>
        {isPermanent
          ? "This ban is permanent. You will not be able to access your account or create a new one using this email address."
          : `Your account will be reviewed again${appealDeadline ? ` by ${appealDeadline}` : ""}. During this period you cannot sign in, publish posts, or interact with other users.`}
      </Callout>

      {!isPermanent && (
        <>
          <SectionTitle>What you can do</SectionTitle>
          <IconRow icon="📧">
            Contact our support team if you believe this action was taken in error.
          </IconRow>
          <IconRow icon="📖">
            Review our{" "}
            <a href={`${BRAND.url}/guidelines`} style={{ color: "#2563eb" }}>
              Community Guidelines
            </a>{" "}
            to understand what is and isn't permitted.
          </IconRow>
        </>
      )}

      <HelpBlock />
    </EmailLayout>
  );
}