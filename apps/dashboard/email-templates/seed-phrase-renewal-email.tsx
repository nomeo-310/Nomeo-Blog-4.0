import * as React from "react";
import {
  EmailLayout, Heading, Paragraph, CtaButton,
  Callout, SectionTitle, IconRow, HelpBlock,
} from "./components";
import { Section, Text } from "@react-email/components";

/**
 * SeedPhraseRenewalEmail — sent when an admin's seed phrase expires and
 * a new one is automatically generated.
 * Replaces raw-HTML sendSeedPhraseExpiringEmail from the previous project.
 */
export default function SeedPhraseRenewalEmail({
  name          = "Admin",
  displayName   = "Admin",
  newSeedPhrase = "apple mountain ocean star thunder forest crystal phoenix dragon shadow light ember",
  expiryDate    = "one year from now",
  loginUrl      = "https://nomeo.com/admin/login",
}: {
  name?:          string;
  displayName?:   string;
  newSeedPhrase?: string;
  expiryDate?:    string;
  loginUrl?:      string;
}) {
  return (
    <EmailLayout preview="Your admin seed phrase has been renewed">
      <Heading>Your seed phrase has been renewed</Heading>

      <Paragraph>Hello {displayName} ({name}),</Paragraph>
      <Paragraph>
        Your previous admin seed phrase has expired. A new recovery key has been automatically
        generated for your account. Save it immediately — you will need it the next time you log in.
      </Paragraph>

      {/* Seed phrase box */}
      <Section
        style={{
          backgroundColor: "#fef3c7",
          border: "2px solid #f59e0b",
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 13, color: "#92400e", fontWeight: 700, margin: "0 0 10px" }}>
          🔑 Your new seed phrase
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#111827",
            fontFamily: "monospace",
            fontWeight: 600,
            lineHeight: "22px",
            backgroundColor: "#ffffff",
            padding: "10px 14px",
            borderRadius: 6,
            margin: "0 0 10px",
          }}
        >
          {newSeedPhrase}
        </Text>
        <Text style={{ fontSize: 12, color: "#92400e", margin: 0 }}>
          ⏰ Expires: {expiryDate}
        </Text>
      </Section>

      <Callout>
        Your old seed phrase is no longer valid. Save this new one immediately in a secure location (password manager or encrypted vault).
      </Callout>

      <SectionTitle>Security reminders</SectionTitle>
      <IconRow icon="🔒">Store this seed phrase somewhere only you can access.</IconRow>
      <IconRow icon="🚫">Never share it with anyone — including Nomeo staff.</IconRow>
      <IconRow icon="🔑">You will need it to complete your next login.</IconRow>
      <IconRow icon="📅">It will expire on {expiryDate} and be automatically renewed.</IconRow>

      <CtaButton href={loginUrl}>Go to admin dashboard</CtaButton>

      <HelpBlock />
    </EmailLayout>
  );
}