// services/transporter.ts  (admin dashboard)
import nodemailer from "nodemailer";

/**
 * Shared Nodemailer transporter for the admin dashboard.
 * Uses the same SMTP credentials as the main webapp — both apps
 * send from the same Nomeo email address.
 *
 * Required env vars (in admin dashboard's .env.local):
 *   SMTP_HOST
 *   SMTP_PORT
 *   SMTP_USER
 *   SMTP_PASS
 *   MAIL_FROM_NAME   (default: "Nomeo")
 *   MAIL_FROM_EMAIL  (default: "noreply@nomeo.com")
 */

export const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST!,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export const FROM = {
  name:    process.env.MAIL_FROM_NAME  || "Nomeo",
  address: process.env.MAIL_FROM_EMAIL || "noreply@nomeo.com",
};