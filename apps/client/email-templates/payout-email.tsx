import { Text } from "@react-email/components";
import { EmailLayout, Heading, Paragraph, DataRow, Divider, CtaButton, HelpBlock, SectionTitle, BRAND } from "./components";

/**
 * Payout Email — sent when CreatorEarning.payoutStatus → "paid".
 * Mirrors the CreatorEarning document: net amount, read minutes, top posts.
 */

export type payoutEmailProps = {
  name?: string;
  period?: string;
  netAmountFormatted?: string;
  readMinutes?: number;
  topPosts?: Array<{ title: string; minutes: number }>;
  dashboardUrl?: string;
}

export default function PayoutEmail({ name = "Creator", period = "January 2026", netAmountFormatted = "₦45,200", readMinutes = 1240, topPosts = [{ title: "Your best post", minutes: 420 }], dashboardUrl = `${BRAND.url}/creator/earnings` }: payoutEmailProps) {

  return (
    <EmailLayout preview={`Your ${period} payout: ${netAmountFormatted}`}>
      <Heading>Your {period} Payout</Heading>
      <Paragraph>Hello {name},</Paragraph>
      <Paragraph>
        Your earnings for {period} have been processed and sent to your payout account. Thank you
        for writing on {BRAND.name} — here's how your month went:
      </Paragraph>

      <Divider />
      <DataRow label="Net payout" value={netAmountFormatted} bold />
      <DataRow label="Subscriber read time" value={`${readMinutes.toLocaleString()} minutes`} />
      <Divider />

      {topPosts.length > 0 && (
        <>
          <SectionTitle>Top earning posts</SectionTitle>
          {topPosts.map((p, i) => (
            <Text key={i} style={{ fontSize: 14, lineHeight: "22px", color: "#374151", margin: "0 0 8px" }}>
              {i + 1}. {p.title} — {p.minutes.toLocaleString()} min
            </Text>
          ))}
        </>
      )}

      <CtaButton href={dashboardUrl}>View Full Breakdown</CtaButton>

      <HelpBlock />
    </EmailLayout>
  );
}