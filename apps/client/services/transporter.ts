import nodemailer from "nodemailer";

/**
 * Transporter — single Nodemailer instance for the whole app.
 *
 * Every email (OTP, notifications, newsletters, campaigns) goes through this.
 * Swap providers by changing env vars only — Gmail/Zoho for development,
 * SES / Resend / Brevo / Postmark SMTP for production volume.
 *
 * Required env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   MAIL_FROM_ADDRESS  e.g. "no-reply@nomeo.com"
 *   MAIL_FROM_NAME     e.g. "Nomeo"
 */

const globalForMail = globalThis as unknown as {
  mailTransporter?: nodemailer.Transporter;
};

export const transporter =
  globalForMail.mailTransporter ??
  nodemailer.createTransport({
    host: process.env.SMTP_SERVER_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465,
    auth: {
      user: process.env.SMTP_SERVER_USERNAME,
      pass: process.env.SMTP_SERVER_PASSWORD,
    },
    pool: true,           // reuse connections — important for batch sends
    maxConnections: 3,
    maxMessages: 100,
  });

if (process.env.NODE_ENV !== "production") {
  globalForMail.mailTransporter = transporter;
}

export const FROM = {
  address: process.env.SITE_MAIL_RECIEVER ?? "no-reply@nomeo.com",
  name: process.env.SITE_NAME ?? "Nomeo",
};