import { EmailLayout, Heading, Paragraph, CtaButton, Callout, HelpBlock } from "./components";

/**
 * Notification Email — the workhorse template.
 * Covers: follow requests/accepts, comments, replies, lounge events,
 * free-read warnings, creator upgrade, moderation notices, co-author
 * responses — anything shaped "something happened → here's a button".
 *
 * The service layer supplies the copy; this template just lays it out.
 */

export type notificationEmailProps = {
  name?: string;
  heading?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  warning?: string;
  unsubscribeUrl?: string;
}

export default function NotificationEmail({ name = "there", heading = "You have a new follower", body = "Someone just followed you on Nomeo.", ctaLabel, ctaUrl, warning, unsubscribeUrl }: notificationEmailProps) {
  return (
    <EmailLayout preview={heading} unsubscribeUrl={unsubscribeUrl}>
      <Heading>{heading}</Heading>
      <Paragraph>Hello {name},</Paragraph>
      <Paragraph>{body}</Paragraph>

      {ctaLabel && ctaUrl && <CtaButton href={ctaUrl}>{ctaLabel}</CtaButton>}

      {warning && <Callout>{warning}</Callout>}

      <HelpBlock />
    </EmailLayout>
  );
}