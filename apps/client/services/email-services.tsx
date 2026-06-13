import { render } from "@react-email/components";
import * as React from "react";
import { transporter, FROM } from "./transporter";
import OtpEmail, { OtpEmailPurpose } from "@/email-templates/otp-email";
import NotificationEmail from "@/email-templates/notification-email";
import PostNewsletterEmail from "@/email-templates/post-newsletter-email";
import ReceiptEmail from "@/email-templates/receipt-email";
import BillingAlertEmail, { BillingAlertKind } from "@/email-templates/billing-alert-email";
import CampaignEmail from "@/email-templates/campaign-email";
import InviteEmail from "@/email-templates/invite-email";
import PayoutEmail from "@/email-templates/payout-email";
import NewsletterConfirmationEmail from "@/email-templates/newsletter-confirmation-email";
import ContactMessageEmail from "@/email-templates/contact-message-email";

/**
 * Mail Service
 * ------------
 * One typed function per email kind. Call these from anywhere in the backend:
 *
 *   await mailService.sendOtp({ to: user.email, name, code, purpose: "password_reset" });
 *
 * Each function renders the react-email template to HTML and sends it
 * through the shared Nodemailer transporter.
 *
 * IMPORTANT for bulk sends (newsletters, campaigns):
 *   Do NOT loop these inside an API request. Enqueue one job per recipient
 *   (BullMQ) and let the worker call sendPostNewsletter / sendCampaign.
 */

type BaseArgs = { to: string };

async function deliver(
  to: string,
  subject: string,
  element: React.ReactElement,
  opts?: { fromName?: string; replyTo?: string; unsubscribeUrl?: string }
) {
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

const SUBJECTS: Record<OtpEmailPurpose, string> = {
  email_verification: "Verify your email",
  password_reset: "Reset your password",
  account_recovery: "Recover your account",
  sensitive_action: "Confirm this action",
};

export const mailService = {
  /* ── Auth / OTP ──────────────────────────────────────────────────────── */

  sendOtp(args: BaseArgs & { name: string; code: string; purpose: OtpEmailPurpose; expiresInMinutes?: number }) {
    return deliver(
      args.to,
      `${SUBJECTS[args.purpose]} — code ${args.code}`,
      <OtpEmail {...args} />
    );
  },

  /* ── Newsletter double opt-in ────────────────────────────────────────── */

  /**
   * Confirmation email for the platform newsletter. Takes the subscriber email
   * and their unsubscribeToken; builds the confirm + unsubscribe URLs.
   */
  sendNewsletterConfirmation(args: { email: string; token: string }) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const confirmUrl = `${base}/api/newsletter/confirm?token=${encodeURIComponent(args.token)}`;
    const unsubscribeUrl = `${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(args.token)}`;
    return deliver(
      args.email,
      "Confirm your Nomeo newsletter subscription",
      <NewsletterConfirmationEmail confirmUrl={confirmUrl} unsubscribeUrl={unsubscribeUrl} />,
      { unsubscribeUrl }
    );
  },

  /* ── Contact form ────────────────────────────────────────────────────── */

  /**
   * Delivers a contact-form submission to the support inbox. The visitor's
   * email is set as reply-to so the team can respond with a normal reply.
   */
  sendContactMessage(args: { fullName: string; email: string; purpose: string; message: string }) {
    const inbox = process.env.CONTACT_INBOX || "support@nomeo.com";
    return deliver(
      inbox,
      `Contact form: ${args.purpose} — ${args.fullName}`,
      <ContactMessageEmail {...args} />,
      { replyTo: args.email }
    );
  },

  /* ── Generic notifications (the workhorse) ───────────────────────────── */

  sendNotification(
    args: BaseArgs & {
      name: string;
      subject: string;
      heading: string;
      body: string;
      ctaLabel?: string;
      ctaUrl?: string;
      warning?: string;
      unsubscribeUrl?: string;
    }
  ) {
    return deliver(args.to, args.subject, <NotificationEmail {...args} />, {
      unsubscribeUrl: args.unsubscribeUrl,
    });
  },

  /* ── Creator newsletter (post → followers) ───────────────────────────── */

  sendPostNewsletter(
    args: BaseArgs & {
      creatorName: string;
      postTitle: string;
      excerpt: string;
      postUrl: string;
      coverImageUrl?: string;
      readingTime?: number;
      unsubscribeUrl: string;
      /** Replies go to the creator */
      creatorReplyTo?: string;
    }
  ) {
    return deliver(
      args.to,
      args.postTitle,
      <PostNewsletterEmail {...args} />,
      {
        fromName: `${args.creatorName} via ${FROM.name}`,
        replyTo: args.creatorReplyTo,
        unsubscribeUrl: args.unsubscribeUrl,
      }
    );
  },

  /* ── Billing ─────────────────────────────────────────────────────────── */

  sendReceipt(
    args: BaseArgs & {
      name: string;
      kind: "started" | "renewed";
      planName: string;
      amountFormatted: string;
      interval: string;
      periodStart: string;
      periodEnd: string;
    }
  ) {
    const subject =
      args.kind === "started" ? "Welcome to Premium — receipt" : "Subscription renewed — receipt";
    return deliver(args.to, subject, <ReceiptEmail {...args} />);
  },

  sendBillingAlert(
    args: BaseArgs & { name: string; kind: BillingAlertKind; periodEnd?: string; actionUrl?: string }
  ) {
    const subjects: Record<BillingAlertKind, string> = {
      payment_failed: "Action needed: payment failed",
      expiring_soon: "Your subscription ends soon",
      cancelled: "Subscription cancelled",
    };
    return deliver(args.to, subjects[args.kind], <BillingAlertEmail {...args} />);
  },

  /* ── Creator earnings ────────────────────────────────────────────────── */

  sendPayout(
    args: BaseArgs & {
      name: string;
      period: string;
      netAmountFormatted: string;
      readMinutes: number;
      topPosts: Array<{ title: string; minutes: number }>;
    }
  ) {
    return deliver(args.to, `Your ${args.period} payout: ${args.netAmountFormatted}`, (
      <PayoutEmail {...args} />
    ));
  },

  /* ── Admin campaigns / platform newsletter ───────────────────────────── */

  sendCampaign(
    args: BaseArgs & {
      subject: string;
      heading: string;
      bodyHtml: string;
      ctaLabel?: string;
      ctaUrl?: string;
      unsubscribeUrl: string;
    }
  ) {
    return deliver(args.to, args.subject, <CampaignEmail {...args} />, {
      unsubscribeUrl: args.unsubscribeUrl,
    });
  },

  /* ── Invites ─────────────────────────────────────────────────────────── */

  sendInvite(
    args: BaseArgs & {
      inviterName: string;
      inviteType: "admin" | "coauthor";
      roleOrContext: string;
      acceptUrl: string;
      personalMessage?: string;
      expiresInDays?: number;
    }
  ) {
    const subject =
      args.inviteType === "admin"
        ? `You're invited to join ${FROM.name} as ${args.roleOrContext}`
        : `${args.inviterName} invited you to co-author a post`;
    return deliver(args.to, subject, <InviteEmail {...args} />);
  },
};