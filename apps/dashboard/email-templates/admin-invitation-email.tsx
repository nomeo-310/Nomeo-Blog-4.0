import * as React from "react";
import {
  EmailLayout, Heading, Paragraph, CtaButton,
  Callout, SectionTitle, IconRow, HelpBlock, BRAND,
} from "./components";
import { Section, Text } from "@react-email/components";

/**
 * AdminInvitationEmail — sent when a super_admin creates a new admin account.
 * Replaces raw-HTML sendAdminInvitationEmail from the previous project.
 *
 * Contains: temp password + seed phrase — both are sensitive.
 * The seed phrase box is styled prominently so it's noticed and saved.
 */
export default function AdminInvitationEmail({
  name          = "Admin",
  displayName   = "Admin",
  role          = "admin",
  email         = "admin@nomeo.com",
  tempPassword  = "TempPass123!",
  seedPhrase    = "apple mountain ocean star thunder forest crystal phoenix dragon shadow light ember",
  loginUrl      = "https://nomeo.com/admin/login",
  expiresAt     = "one year from now",
}: {
  name?:        string;
  displayName?: string;
  role?:        string;
  email?:       string;
  tempPassword?: string;
  seedPhrase?:  string;
  loginUrl?:    string;
  expiresAt?:   string;
}) {
  const formattedRole = role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <EmailLayout preview={`You've been invited to join ${BRAND.name} as ${formattedRole}`}>
      <Heading>Welcome to the {BRAND.name} admin team</Heading>

      <Paragraph>Hello {displayName} ({name}),</Paragraph>
      <Paragraph>
        You've been invited to join the {BRAND.name} administration team as a{" "}
        <strong>{formattedRole}</strong>. Your account has been created and is ready to use.
      </Paragraph>

      {/* Credentials block */}
      <SectionTitle>Your login credentials</SectionTitle>

      <Section style={{ backgroundColor: "#f0f4ff", borderRadius: 8, padding: "16px 20px", marginBottom: 16 }}>
        <Text style={{ fontSize: 13, color: "#374151", margin: "0 0 8px" }}>
          <strong>Email address</strong>
        </Text>
        <Text style={{ fontSize: 14, color: "#111827", fontFamily: "monospace", margin: "0 0 16px" }}>
          {email}
        </Text>
        <Text style={{ fontSize: 13, color: "#374151", margin: "0 0 8px" }}>
          <strong>Temporary password</strong>
        </Text>
        <Text style={{ fontSize: 15, color: "#111827", fontFamily: "monospace", fontWeight: 700, margin: 0 }}>
          {tempPassword}
        </Text>
      </Section>

      {/* Seed phrase block — visually distinct */}
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
          🔑 Your seed phrase (recovery key)
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
          {seedPhrase}
        </Text>
        <Text style={{ fontSize: 12, color: "#92400e", margin: 0 }}>
          Expires: {expiresAt}. Save this in a password manager or encrypted vault — you will need it to authenticate.
        </Text>
      </Section>

      <Callout>
        Never share your seed phrase with anyone — not even {BRAND.name} staff. Change your temporary password immediately after first login.
      </Callout>

      <CtaButton href={loginUrl}>Login to admin dashboard</CtaButton>

      <SectionTitle>Next steps</SectionTitle>
      <IconRow icon="1️⃣">Click the button above to access your admin dashboard.</IconRow>
      <IconRow icon="2️⃣">Change your temporary password immediately after signing in.</IconRow>
      <IconRow icon="3️⃣">Save your seed phrase in a secure location before closing this email.</IconRow>

      <HelpBlock />
    </EmailLayout>
  );
}