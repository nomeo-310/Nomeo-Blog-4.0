import { EmailLayout, Heading, Paragraph, CtaButton, Callout, Divider } from "./components";

/**
 * Invite Email — admin/moderator invites (admin-invite.ts) and
 * co-author invitations (post.ts coAuthors).
 */

export type inviteEmailProps = {
  inviterName?: string;
  inviteType?: "admin" | "coauthor";
  /** For admin: the role. For coauthor: the post title. */
  roleOrContext?: string;
  personalMessage?: string;
  acceptUrl?: string;
  expiresInDays?: number;
}

export default function InviteEmail({ inviterName = "Someone", inviteType = "admin", roleOrContext = "moderator", personalMessage, acceptUrl = "https://nomeo.com/invite/token", expiresInDays = 7 }: inviteEmailProps) {

  const heading = inviteType === "admin" ? "You're Invited to the Team" : "Co-author Invitation";

  const body =
    inviteType === "admin"
      ? `${inviterName} has invited you to join the team as a ${roleOrContext}. Accept the invite to set up your account and get started.`
      : `${inviterName} has invited you to collaborate as a co-author on "${roleOrContext}". Accept to start contributing.`;

  return (
    <EmailLayout preview={heading}>
      <Heading>{heading}</Heading>
      <Paragraph>{body}</Paragraph>

      {personalMessage && (
        <>
          <Divider />
          <Paragraph muted>"{personalMessage}" — {inviterName}</Paragraph>
          <Divider />
        </>
      )}

      <CtaButton href={acceptUrl}>Accept Invitation</CtaButton>

      <Callout>
        This invitation expires in {expiresInDays} days. If you weren't expecting it, you can
        safely ignore this email.
      </Callout>
    </EmailLayout>
  );
}