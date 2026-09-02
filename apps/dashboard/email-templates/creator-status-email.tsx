import * as React from "react";
import { EmailLayout, Heading, Paragraph, Callout, SectionTitle, HelpBlock, BRAND } from "./components";

/**
 * CreatorStatusEmail — sent when an admin changes an existing creator's
 * standing: suspending their creator privileges, reinstating them, or
 * demoting them back to a regular reader account. Distinct from
 * CreatorApprovalEmail, which covers the initial application decision.
 */
export type CreatorStatusAction = "suspend" | "reinstate" | "demote";

export default function CreatorStatusEmail({
  name        = "there",
  action      = "suspend",
  reason,
  performedBy = "the QuilHub moderation team",
}: {
  name?:        string;
  action?:      CreatorStatusAction;
  reason?:      string;
  performedBy?: string;
}) {
  const titles: Record<CreatorStatusAction, string> = {
    suspend:   "Your creator privileges have been suspended",
    reinstate: "Your creator privileges have been reinstated",
    demote:    "Your creator account has been changed to a reader account",
  };

  const title = titles[action];

  return (
    <EmailLayout preview={title}>
      <Heading>{title}</Heading>

      <Paragraph>Hi {name},</Paragraph>

      {action === "suspend" && (
        <Paragraph>
          {performedBy} has suspended your creator privileges on {BRAND.name}. You can still read
          and comment, but you cannot publish posts, access your lounge, or earn from the
          subscription pool while suspended.
        </Paragraph>
      )}
      {action === "reinstate" && (
        <Paragraph>
          {performedBy} has reinstated your creator privileges on {BRAND.name}. You can now
          publish posts, access your lounge, and earn from the subscription pool as before.
        </Paragraph>
      )}
      {action === "demote" && (
        <Paragraph>
          {performedBy} has changed your account from creator back to a regular reader account on{" "}
          {BRAND.name}. You no longer have access to creator features such as publishing, your
          lounge, or subscription earnings. Your existing posts remain published.
        </Paragraph>
      )}

      {reason && (
        <>
          <SectionTitle>Reason</SectionTitle>
          <Paragraph>{reason}</Paragraph>
        </>
      )}

      {action !== "reinstate" && (
        <Callout>
          Contact our support team if you believe this action was taken in error.
        </Callout>
      )}

      <HelpBlock />
    </EmailLayout>
  );
}
