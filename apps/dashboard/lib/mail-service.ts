// lib/mail-service.ts  (admin dashboard — separate Next.js app)
import { render } from "@react-email/components";
import * as React from "react";
import { FROM, transporter } from "@/services/transporter";

import UserBanEmail           from "@/email-templates/user-ban-email";
import UserUnbanEmail         from "@/email-templates/user-unban-email";
import UserWarningEmail       from "@/email-templates/user-warning-email";
import AccountDeletionEmail   from "@/email-templates/account-deletion-email";
import AdminInvitationEmail   from "@/email-templates/admin-invitation-email";
import AdminActionEmail, { AdminActionType }      from "@/email-templates/admin-action-email";
import SeedPhraseRenewalEmail from "@/email-templates/seed-phrase-renewal-email";
import CreatorApprovalEmail   from "@/email-templates/creator-approval-email";
import CreatorStatusEmail, { CreatorStatusAction } from "@/email-templates/creator-status-email";
import CampaignEmail          from "@/email-templates/campaign-email";


async function deliver(to: string, subject: string, element: React.ReactElement, opts?: { fromName?: string; replyTo?: string; unsubscribeUrl?: string }) {
  const html = await render(element);
  return transporter.sendMail({
    from: `"${opts?.fromName ?? FROM.name}" <${FROM.address}>`,
    to,
    subject,
    html,
    replyTo: opts?.replyTo,
    headers: opts?.unsubscribeUrl
      ? {
          "List-Unsubscribe": `<${opts.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined,
  });
}

export const mailService = {

  /* ── User moderation ─────────────────────────────────────────────────── */

  banUser({ to, ...props }: {
    to: string;
    name: string;
    reason: string;
    isPermanent?: boolean;
    durationDays?: number;
    bannedBy?: string;
    appealDeadline?: string;
  }) {
    const subject = props.isPermanent ? "Your QuilHub account has been permanently banned" : "Your QuilHub account has been temporarily banned";
    return deliver(to, subject, React.createElement(UserBanEmail, props));
  },

  unbanUser({ to, ...props }: {
    to: string;
    name: string;
    unbannedBy?: string;
    note?: string;
  }) {
    return deliver(to, "Your QuilHub account has been reinstated", React.createElement(UserUnbanEmail, props));
  },

  warnUser({ to, ...props }: {
    to: string;
    name: string;
    reason: string;
    warnedBy?: string;
  }) {
    return deliver(to, "You've received a warning from the QuilHub team", React.createElement(UserWarningEmail, props));
  },

  deleteUser({ to, ...props }: {
    to: string;
    name: string;
    reason: string;
    deletionType: "soft" | "hard";
    scheduledDeletionDate?: string;
    initiatedBy?: string;
  }) {
    const subject = props.deletionType === "soft"
      ? "Your QuilHub account is scheduled for deletion"
      : "Your QuilHub account has been permanently deleted";
    return deliver(
      to,
      subject,
      React.createElement(AccountDeletionEmail, props)
    );
  },

  creatorApplicationResult({ to, ...props }: {
    to: string;
    name: string;
    approved: boolean;
    reason?: string;
    canReapply?: boolean;
  }) {
    const subject = props.approved
      ? "Congratulations — your creator application has been approved!"
      : "Update on your QuilHub creator application";
    return deliver(to, subject, React.createElement(CreatorApprovalEmail, props));
  },

  creatorStatusChange({ to, ...props }: {
    to: string;
    name: string;
    action: CreatorStatusAction;
    reason?: string;
    performedBy?: string;
  }) {
    const subjects: Record<CreatorStatusAction, string> = {
      suspend:   "Your creator privileges have been suspended",
      reinstate: "Your creator privileges have been reinstated",
      demote:    "Your creator account has been changed to a reader account",
    };
    return deliver(to, subjects[props.action], React.createElement(CreatorStatusEmail, props));
  },

  /* ── Campaigns ───────────────────────────────────────────────────────── */

  sendCampaign({ to, subject, ...props }: {
    to: string;
    subject: string;
    heading: string;
    bodyHtml: string;
    ctaLabel?: string;
    ctaUrl?: string;
    unsubscribeUrl: string;
    subscriberName?: string;
  }) {
    return deliver(to, subject, React.createElement(CampaignEmail, props), {
      unsubscribeUrl: props.unsubscribeUrl,
    });
  },

  /* ── Admin account ───────────────────────────────────────────────────── */

  inviteAdmin({ to, ...props }: {
    to: string;
    name: string;
    displayName: string;
    role: string;
    email: string;
    tempPassword: string;
    seedPhrase: string;
    loginUrl: string;
    expiresAt: string;
    personalMessage?: string;
  }) {
    return deliver(
      to,
      `You've been invited to join ${FROM.name} as admin`,
      React.createElement(AdminInvitationEmail, props)
    );
  },

  adminAction({ to, ...props }: {
    to: string;
    name: string;
    action: AdminActionType;
    details: string;
    performedBy: string;
    performedByEmail: string;
    oldRole?: string;
    newRole?: string;
    reason?: string;
    newPassword?: string;
    loginUrl?: string;
  }) {
    const subjects: Record<AdminActionType, string> = {
      promote:        "Your admin role has been upgraded",
      demote:         "Your admin role has been changed",
      suspend:        "Your admin account has been suspended",
      activate:       "Your admin account has been activated",
      password_reset: "Your admin password has been reset",
      remove:         "Your admin access has been removed",
    };
    return deliver(
      to,
      subjects[props.action] ?? "Admin account update",
      React.createElement(AdminActionEmail, props)
    );
  },

  seedPhraseRenewal({ to, ...props }: {
    to: string;
    name: string;
    displayName: string;
    newSeedPhrase: string;
    expiryDate: string;
    loginUrl: string;
  }) {
    return deliver(
      to,
      "Your admin seed phrase has been renewed",
      React.createElement(SeedPhraseRenewalEmail, props)
    );
  },
};