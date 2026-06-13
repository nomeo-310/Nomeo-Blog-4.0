import { EmailLayout, Heading, Paragraph, CtaButton, Callout, HelpBlock, BRAND } from "./components";

/**
 * Billing Alert Email — payment failed / expiring soon / cancelled.
 */

export type billingAlertEmailProps = {
  name?: string;
  kind?: BillingAlertKind;
  /** e.g. "1 Feb 2026" — appended to the body when provided */
  periodEnd?: string;
  actionUrl?: string;
}

export type BillingAlertKind = "payment_failed" | "expiring_soon" | "cancelled";

const COPY: Record<BillingAlertKind, { heading: string; body: string; cta: string; warn?: string }> = {
  payment_failed: {
    heading: "Payment Failed",
    body: "We couldn't process your last subscription payment. Your access continues during a short grace period — please update your payment method to keep it.",
    cta: "Update Payment Method",
    warn: "If payment isn't completed before the grace period ends, your subscription will be paused and paid posts will be locked.",
  },
  expiring_soon: {
    heading: "Your Subscription Ends Soon",
    body: "Your subscription is set to end soon and auto-renew is off. Renew now to keep unlimited access to paid posts.",
    cta: "Renew Subscription",
  },
  cancelled: {
    heading: "Subscription Cancelled",
    body: "Your subscription has been cancelled. You'll keep full access until the end of your current billing period — after that, paid posts will be locked.",
    cta: "Resubscribe",
  },
};

export default function BillingAlertEmail({ name = "there", kind = "payment_failed", periodEnd, actionUrl = `${BRAND.url}/settings/subscription` }: billingAlertEmailProps) {

  const c = COPY[kind];

  return (
    <EmailLayout preview={c.heading}>
      <Heading>{c.heading}</Heading>
      <Paragraph>Hello {name},</Paragraph>
      <Paragraph>
        {c.body}
        {periodEnd ? ` Your access runs until ${periodEnd}.` : ""}
      </Paragraph>

      <CtaButton href={actionUrl}>{c.cta}</CtaButton>

      {c.warn && <Callout>{c.warn}</Callout>}

      <HelpBlock />
    </EmailLayout>
  );
} 