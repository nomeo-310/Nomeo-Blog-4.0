import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

/**
 * Shared email building blocks
 * ----------------------------
 * One layout, used by every template. Matches the reference design:
 * white rounded card on a light-gray page, centered logo, bold left-aligned
 * heading, blue CTA, amber callout, help block, gray footer band.
 *
 * All styles are inline objects — required for email client compatibility.
 * react-email compiles this to table-based HTML that renders everywhere.
 */

/* ── Brand tokens — edit once, applies to every email ─────────────────── */

export const BRAND = {
  name: "Nomeo",
  url: "https://nomeo.com",
  supportEmail: "support@nomeo.com",
  address: "Lagos, Nigeria",
  social: {
    twitter: "https://x.com/nomeo",
    instagram: "https://instagram.com/nomeo",
  },
};

const color = {
  pageBg: "#e9e9ee",
  card: "#ffffff",
  footerBand: "#f4f5f7",
  blue: "#2563eb",
  heading: "#111827",
  body: "#374151",
  muted: "#6b7280",
  faint: "#9ca3af",
  divider: "#e5e7eb",
  calloutBg: "#fef9e7",
  calloutBorder: "#f5b50a",
  calloutText: "#92400e",
};

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/* ── Layout ────────────────────────────────────────────────────────────── */

export function EmailLayout({
  preview,
  children,
  unsubscribeUrl,
}: {
  preview: string;
  children: React.ReactNode;
  /** When set, an Unsubscribe link is shown in the footer */
  unsubscribeUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: color.pageBg, fontFamily: font, margin: 0, padding: "24px 12px" }}>
        <Container
          style={{
            backgroundColor: color.card,
            borderRadius: 12,
            maxWidth: 600,
            margin: "0 auto",
            overflow: "hidden",
          }}
        >
          {/* Wordmark */}
          <Section style={{ padding: "32px 32px 4px", textAlign: "center" as const }}>
            <Text
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-0.5px",
                color: color.heading,
                margin: 0,
              }}
            >
              {BRAND.name}
            </Text>
          </Section>

          {/* Content */}
          <Section style={{ padding: "8px 32px 32px" }}>{children}</Section>

          {/* Hairline divider above the footer */}
          <Hr style={{ borderColor: color.divider, margin: 0 }} />

          {/* Footer band */}
          <Section
            style={{
              backgroundColor: color.footerBand,
              padding: "20px 32px",
              textAlign: "center" as const,
            }}
          >
            <Text style={{ fontSize: 12, color: color.faint, margin: "0 0 4px" }}>
              © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
            </Text>
            <Text style={{ fontSize: 12, color: color.faint, margin: "0 0 12px" }}>{BRAND.address}</Text>
            <Text style={{ fontSize: 12, margin: 0 }}>
              {unsubscribeUrl && (
                <>
                  <Link href={unsubscribeUrl} style={footerLink}>
                    Unsubscribe
                  </Link>
                  <span style={{ color: color.faint }}> | </span>
                </>
              )}
              <Link href={`${BRAND.url}/privacy`} style={footerLink}>
                Privacy Policy
              </Link>
              <span style={{ color: color.faint }}> | </span>
              <Link href={`${BRAND.url}/terms`} style={footerLink}>
                Terms of Service
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const footerLink = {
  color: color.muted,
  textDecoration: "underline" as const,
  fontSize: 12,
};

/* ── Pieces ────────────────────────────────────────────────────────────── */

export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 24, fontWeight: 700, color: color.heading, margin: "16px 0 20px" }}>
      {children}
    </Text>
  );
}

export function Paragraph({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <Text style={{ fontSize: 15, lineHeight: "24px", color: muted ? color.muted : color.body, margin: "0 0 16px" }}>
      {children}
    </Text>
  );
}

export function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
      <Link
        href={href}
        style={{
          backgroundColor: color.blue,
          borderRadius: 8,
          color: "#ffffff",
          display: "inline-block",
          fontSize: 15,
          fontWeight: 600,
          padding: "13px 28px",
          textDecoration: "none",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 17, fontWeight: 700, color: color.heading, margin: "28px 0 12px" }}>
      {children}
    </Text>
  );
}

/** Icon + text row — used for tips and the Need Help block */
export function IconRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 14, lineHeight: "22px", color: color.body, margin: "0 0 10px" }}>
      <span style={{ marginRight: 10 }}>{icon}</span>
      {children}
    </Text>
  );
}

/** Amber warning callout with left border, as in the reference */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: color.calloutBg,
        borderLeft: `4px solid ${color.calloutBorder}`,
        borderRadius: 4,
        margin: "24px 0",
        padding: "14px 16px",
      }}
    >
      <Text style={{ fontSize: 13, lineHeight: "20px", color: color.calloutText, margin: 0 }}>
        ⚠️ {children}
      </Text>
    </Section>
  );
}

export function Divider() {
  return <Hr style={{ borderColor: color.divider, margin: "32px 0" }} />;
}

/** "Need Help?" block — appended to transactional emails */
export function HelpBlock() {
  return (
    <>
      <Divider />
      <SectionTitle>Need Help?</SectionTitle>
      <Paragraph muted>Our support team is available to assist you:</Paragraph>
      <IconRow icon="✉️">{BRAND.supportEmail}</IconRow>
    </>
  );
}

/** Big OTP code display */
export function CodeBox({ code }: { code: string }) {
  return (
    <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
      <Text
        style={{
          backgroundColor: "#f3f4f6",
          borderRadius: 8,
          color: color.heading,
          display: "inline-block",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: 8,
          padding: "16px 32px",
          margin: 0,
        }}
      >
        {code}
      </Text>
    </Section>
  );
}

/** Two-column data row for receipts and payouts */
export function DataRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <table width="100%" style={{ margin: "0 0 8px" }}>
      <tbody>
        <tr>
          <td style={{ fontSize: 14, color: color.muted, fontFamily: font }}>{label}</td>
          <td
            style={{
              fontSize: 14,
              color: color.heading,
              fontWeight: bold ? 700 : 500,
              textAlign: "right" as const,
              fontFamily: font,
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}