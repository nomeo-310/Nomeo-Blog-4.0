import { EmailLayout, Heading, Paragraph, CtaButton } from "./components";

/**
 * NewsletterConfirmationEmail — double opt-in.
 * Sent when someone subscribes via the footer/landing form. The link confirms
 * their subscription (flips status → confirmed).
 */
export default function NewsletterConfirmationEmail({ confirmUrl, unsubscribeUrl }: { confirmUrl: string; unsubscribeUrl?: string }) {
  
  return (
    <EmailLayout preview="Confirm your Nomeo newsletter subscription" unsubscribeUrl={unsubscribeUrl}>
      <Heading>Confirm your subscription</Heading>
      <Paragraph>
        Thanks for subscribing to the Nomeo newsletter. Tap the button below to
        confirm your email — then you&apos;ll start receiving the best new
        stories and writer spotlights.
      </Paragraph>

      <CtaButton href={confirmUrl}>Confirm subscription</CtaButton>

      <Paragraph muted>
        If you didn&apos;t request this, you can safely ignore this email — no
        subscription will be created.
      </Paragraph>
    </EmailLayout>
  );
}