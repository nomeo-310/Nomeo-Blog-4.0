import * as React from "react";
import { EmailLayout, Heading, Paragraph, Callout, SectionTitle, HelpBlock, DataRow, Divider } from "./components";

/**
 * AccountDeletionEmail — sent when an admin deletes a user's account.
 * Replaces the raw-HTML sendAccountDeletionEmail from the previous project.
 *
 * deletionType:
 *   "soft" — 30-day grace period before permanent erasure
 *   "hard" — immediate, irreversible
 */
export default function AccountDeletionEmail({
  name = "there",
  reason = "policy violation",
  deletionType = "soft",
  scheduledDeletionDate,
  initiatedBy = "the Nomeo moderation team",
}: {
  name?: string;
  reason?: string;
  deletionType?: "soft" | "hard";
  /** ISO string — only relevant for soft delete */
  scheduledDeletionDate?: string;
  initiatedBy?: string;
}) {
  const isSoft  = deletionType === "soft";
  const title   = isSoft ? "Your account is scheduled for deletion" : "Your account has been permanently deleted";
  const preview = isSoft ? "Account scheduled for deletion — you have 30 days" : "Your Nomeo account has been deleted";

  return (
    <EmailLayout preview={preview}>
      <Heading>{title}</Heading>

      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>
        {isSoft
          ? "Your Nomeo account has been scheduled for deletion due to a policy violation. You have a 30-day grace period before all data is permanently erased."
          : "Your Nomeo account has been permanently deleted. All associated data has been removed from our systems."}
      </Paragraph>

      <SectionTitle>Details</SectionTitle>
      <DataRow label="Reason"       value={reason} />
      <DataRow label="Initiated by" value={initiatedBy} />
      <DataRow label="Date"         value={new Date().toLocaleDateString("en-NG")} />
      <DataRow label="Type"         value={isSoft ? "Soft delete (30-day grace)" : "Immediate deletion"} />
      {isSoft && scheduledDeletionDate && (
        <DataRow label="Permanent deletion" value={new Date(scheduledDeletionDate).toLocaleDateString("en-NG")} bold />
      )}

      <Divider />

      {isSoft ? (
        <Callout>
          You have until {scheduledDeletionDate ? new Date(scheduledDeletionDate).toLocaleDateString("en-NG") : "30 days from now"} to
          contact support if you believe this action was taken in error. After that date, recovery is impossible.
        </Callout>
      ) : (
        <Callout>
          This action is irreversible. All your posts, comments, connections, and account data have been permanently removed.
        </Callout>
      )}

      <HelpBlock />
    </EmailLayout>
  );
}