import * as React from "react";
import {
  EmailLayout, Heading, Paragraph, CtaButton,
  SectionTitle, IconRow, HelpBlock, BRAND,
} from "./components";

/**
 * CreatorApprovalEmail — sent when an admin approves or rejects
 * a creator application.
 */
export default function CreatorApprovalEmail({
  name     = "there",
  approved = true,
  reason,
  canReapply = true,
}: {
  name?:       string;
  approved?:   boolean;
  /** Rejection reason — required when approved is false */
  reason?:     string;
  canReapply?: boolean;
}) {
  const preview = approved
    ? "Congratulations — your creator application has been approved!"
    : "Update on your creator application";

  return (
    <EmailLayout preview={preview}>
      <Heading>
        {approved
          ? "🎉 Your creator application has been approved!"
          : "Update on your creator application"}
      </Heading>

      <Paragraph>Hi {name},</Paragraph>

      {approved ? (
        <>
          <Paragraph>
            Congratulations! Your application to become a creator on {BRAND.name} has been
            approved. Your account has been upgraded and you can now publish paid posts, create
            a lounge, and earn from the subscription pool.
          </Paragraph>

          <SectionTitle>What you can do now</SectionTitle>
          <IconRow icon="✍️">Publish posts — free and paid (members-only).</IconRow>
          <IconRow icon="🏠">Create a private lounge for your closest readers.</IconRow>
          <IconRow icon="💰">Earn a share of platform subscription revenue.</IconRow>
          <IconRow icon="📊">Track your earnings from your dashboard.</IconRow>

          <CtaButton href={`${BRAND.url}/dashboard`}>Go to your creator dashboard</CtaButton>
        </>
      ) : (
        <>
          <Paragraph>
            Thank you for applying to become a creator on {BRAND.name}. After reviewing your
            application, we are unable to approve it at this time.
          </Paragraph>

          {reason && (
            <>
              <SectionTitle>Reason</SectionTitle>
              <Paragraph>{reason}</Paragraph>
            </>
          )}

          {canReapply && (
            <>
              <SectionTitle>Next steps</SectionTitle>
              <Paragraph>
                You are welcome to reapply after addressing the feedback above. Review our{" "}
                <a href={`${BRAND.url}/guidelines`} style={{ color: "#2563eb" }}>
                  Creator Guidelines
                </a>{" "}
                and resubmit when you are ready.
              </Paragraph>
            </>
          )}
        </>
      )}

      <HelpBlock />
    </EmailLayout>
  );
}