// services/transporter.ts  (admin dashboard)
import nodemailer from "nodemailer";

/**
 * Shared Nodemailer transporter for the admin dashboard.
 * Uses the same SMTP credentials as the main webapp — both apps
 * send from the same Nomeo email address.
 *
 * Required env vars (in admin dashboard's .env):
 *   SMTP_SERVER_HOST
 *   SMTP_PORT
 *   SMTP_SECURE       (optional — defaults to true when SMTP_PORT is 465)
 *   SMTP_SERVER_USERNAME
 *   SMTP_SERVER_PASSWORD
 *   SITE_NAME           (default: "Nomeo")
 *   SITE_MAIL_RECIEVER  (default: "noreply@nomeo.com")
 */

export const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_SERVER_HOST!,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_SERVER_USERNAME!,
    pass: process.env.SMTP_SERVER_PASSWORD!,
  },
  pool: true,            // reuse connections — important for campaign bulk sends
  maxConnections: 3,
  maxMessages: 100,
});

export const FROM = {
  name:    process.env.SITE_NAME          || "Nomeo",
  address: process.env.SITE_MAIL_RECIEVER || "noreply@nomeo.com",
};