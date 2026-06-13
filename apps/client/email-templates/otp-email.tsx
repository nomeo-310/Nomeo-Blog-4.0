import { EmailLayout, Heading, Paragraph, CodeBox, Callout, HelpBlock, SectionTitle, IconRow } from "./components";

/**
 * OTP Email — one template, four purposes (matches otp.ts OtpPurpose).
 */

export type otpEmailProps = {
  name?: string;
  code?: string;
  purpose?: OtpEmailPurpose;
  expiresInMinutes?: number;  
}

export type OtpEmailPurpose =
  | "email_verification"
  | "account_recovery"
  | "password_reset"
  | "sensitive_action";

const COPY: Record<OtpEmailPurpose, { heading: string; intro: string; warn: string }> = {
  email_verification: {
    heading: "Verify Your Email",
    intro: "Welcome! Use the code below to confirm your email address and finish setting up your account.",
    warn: "If you didn't create an account, you can safely ignore this email.",
  },
  password_reset: {
    heading: "Reset Your Password",
    intro: "We received a request to reset your password. Use the code below to continue.",
    warn: "If you didn't request this password reset, please ignore this email or contact our support team immediately.",
  },
  account_recovery: {
    heading: "Recover Your Account",
    intro: "We received a request to recover your deleted account. Use the code below to restore it.",
    warn: "If you didn't request account recovery, ignore this email — your account will stay deleted.",
  },
  sensitive_action: {
    heading: "Confirm This Action",
    intro: "A sensitive change was requested on your account. Enter the code below to confirm it was you.",
    warn: "If you didn't request this change, secure your account by changing your password now.",
  },
};

export default function OtpEmail({ name = "there", code = "482910", purpose = "password_reset", expiresInMinutes = 10 }: otpEmailProps) {

  const c = COPY[purpose];
  return (
    <EmailLayout preview={`${c.heading} — your code is ${code}`}>
      <Heading>{c.heading}</Heading>
      <Paragraph>Hello {name},</Paragraph>
      <Paragraph>{c.intro}</Paragraph>

      <CodeBox code={code} />

      <Paragraph muted>This code expires in {expiresInMinutes} minutes.</Paragraph>

      {purpose === "password_reset" && (
        <>
          <SectionTitle>Security Tips</SectionTitle>
          <IconRow icon="🛡️">Don't reuse passwords from other accounts</IconRow>
          <IconRow icon="🛡️">Use at least 8 characters with numbers and symbols</IconRow>
          <IconRow icon="🛡️">Never share your password with anyone</IconRow>
        </>
      )}

      <Callout>{c.warn}</Callout>
      <HelpBlock />
    </EmailLayout>
  );
}