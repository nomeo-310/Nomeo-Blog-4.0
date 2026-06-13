import { EmailLayout, Heading, Paragraph, DataRow, Divider, HelpBlock, CtaButton, BRAND } from "./components";

/**
 * Receipt Email — subscription started or renewed.
 */
export type receiptEmailProps = {
  name?: string;
  kind?: "started" | "renewed";
  planName?: string;
  /** Pre-formatted with currency symbol, e.g. "₦2,500" */
  amountFormatted?: string;
  interval?: string;
  periodStart?: string;
  periodEnd?: string;
  manageUrl?: string; 
}
export default function ReceiptEmail({ name = "there", kind = "started", planName = "Monthly", amountFormatted = "₦2,500", interval = "monthly", periodStart = "1 Jan 2026", periodEnd = "1 Feb 2026", manageUrl = `${BRAND.url}/settings/subscription` }: receiptEmailProps) {
  
  const heading = kind === "started" ? "Welcome to Premium" : "Subscription Renewed";
  const intro =
    kind === "started"
      ? "Your subscription is active. You now have unlimited access to all paid posts, and your reading supports the writers you love."
      : "Your subscription has renewed successfully. Here's your receipt.";

  return (
    <EmailLayout preview={`${heading} — receipt for your ${planName} plan`}>
      <Heading>{heading}</Heading>
      <Paragraph>Hello {name},</Paragraph>
      <Paragraph>{intro}</Paragraph>

      <Divider />
      <DataRow label="Plan" value={`${planName} (${interval})`} />
      <DataRow label="Amount" value={amountFormatted} bold />
      <DataRow label="Period" value={`${periodStart} – ${periodEnd}`} />
      <Divider />

      <CtaButton href={manageUrl}>Manage Subscription</CtaButton>

      <HelpBlock />
    </EmailLayout>
  );
}