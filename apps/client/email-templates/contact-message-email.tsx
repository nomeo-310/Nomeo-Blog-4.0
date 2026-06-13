import * as React from "react";
import { EmailLayout, Heading, Paragraph, DataRow, Divider } from "./components";

/**
 * ContactMessageEmail — internal email sent to the Nomeo support inbox when a
 * visitor submits the contact form. Formatted so the team can read and reply
 * easily; reply-to is set to the sender on the service side.
 */
export default function ContactMessageEmail({ fullName, email, purpose, message }: {
  fullName: string;
  email: string;
  purpose: string;
  message: string;
}) {
  return (
    <EmailLayout preview={`New contact message: ${purpose}`}>
      <Heading>New contact message</Heading>
      <Paragraph muted>
        Someone reached out through the Nomeo contact form. Reply directly to
        this email to respond to them.
      </Paragraph>

      <Divider />

      <DataRow label="Name" value={fullName} bold />
      <DataRow label="Email" value={email} />
      <DataRow label="Purpose" value={purpose} />

      <Divider />

      <Paragraph>{message}</Paragraph>
    </EmailLayout>
  );
}