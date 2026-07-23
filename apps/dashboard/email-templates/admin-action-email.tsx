import * as React from "react";
import {
  EmailLayout, Heading, Paragraph, Callout,
  SectionTitle, IconRow, HelpBlock, DataRow, CtaButton,
} from "./components";
import { Section, Text } from "@react-email/components";

/**
 * AdminActionEmail — generic notification for actions taken on an admin account.
 * Covers: role change, suspension, activation, password reset.
 * Replaces raw-HTML sendAdminActionEmail from the previous project.
 */

export type AdminActionType = "promote" | "demote" | "suspend" | "activate" | "password_reset";

export default function AdminActionEmail({
  name          = "Admin",
  action        = "activate",
  details       = "Your admin account has been updated.",
  performedBy   = "Super Admin",
  performedByEmail = "superadmin@nomeo.com",
  oldRole,
  newRole,
  reason,
  newPassword,
  loginUrl,
}: {
  name?:             string;
  action?:           AdminActionType;
  details?:          string;
  performedBy?:      string;
  performedByEmail?: string;
  oldRole?:          string;
  newRole?:          string;
  reason?:           string;
  /** Only present for password_reset */
  newPassword?:      string;
  loginUrl?:         string;
}) {
  const titles: Record<AdminActionType, string> = {
    promote:        "Your admin role has been upgraded",
    demote:         "Your admin role has been changed",
    suspend:        "Your admin account has been suspended",
    activate:       "Your admin account has been activated",
    password_reset: "Your admin password has been reset",
  };

  const isPasswordReset = action === "password_reset" && !!newPassword;
  const title = titles[action] ?? "Admin account update";

  return (
    <EmailLayout preview={title}>
      <Heading>{title}</Heading>

      <Paragraph>Hi {name},</Paragraph>
      <Paragraph>{details}</Paragraph>

      <SectionTitle>Update details</SectionTitle>
      <DataRow label="Performed by" value={`${performedBy} (${performedByEmail})`} />
      <DataRow label="Date"         value={new Date().toLocaleString("en-NG")} />
      {oldRole && newRole && (
        <DataRow label="Role change" value={`${oldRole} → ${newRole}`} bold />
      )}

      {reason && !isPasswordReset && (
        <>
          <SectionTitle>Reason provided</SectionTitle>
          <Paragraph>{reason}</Paragraph>
        </>
      )}

      {/* Password reset block */}
      {isPasswordReset && (
        <>
          <SectionTitle>Your new password</SectionTitle>
          <Section
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "16px 20px",
              textAlign: "center" as const,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "monospace",
                color: "#dc2626",
                letterSpacing: 2,
                margin: 0,
              }}
            >
              {newPassword}
            </Text>
          </Section>

          <Callout>
            Change this password immediately after logging in. Do not share it with anyone.
          </Callout>

          {loginUrl && <CtaButton href={loginUrl}>Login to admin dashboard</CtaButton>}

          <SectionTitle>Security tips</SectionTitle>
          <IconRow icon="🔒">Do not share this password with anyone.</IconRow>
          <IconRow icon="🔄">Change it immediately after your first login.</IconRow>
          <IconRow icon="📞">Contact support if you did not request this reset.</IconRow>
        </>
      )}

      {action === "suspend" && (
        <Callout>
          You cannot access the admin dashboard while your account is suspended. Contact the super admin if you believe this is an error.
        </Callout>
      )}

      <HelpBlock />
    </EmailLayout>
  );
}