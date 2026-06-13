import { mailService } from "@/services/email-services";
import { NextRequest } from "next/server";

/**
 * POST /api/contact  { fullName, email, purpose, message }
 * --------------------------------------------------------
 * Sends a contact-form submission to the support inbox via nodemailer, with
 * reply-to set to the sender. No mail app on the user's side — they fill the
 * form and we receive a formatted email.
 */

const EMAIL_RX = /^\S+@\S+\.\S+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim();
    const purpose = String(body.purpose || "General").trim();
    const message = String(body.message || "").trim();

    // Validation
    if (fullName.length < 2) {
      return Response.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!EMAIL_RX.test(email)) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (message.length < 10) {
      return Response.json({ error: "Your message is a little short — add a bit more detail." }, { status: 400 });
    }
    if (message.length > 5000) {
      return Response.json({ error: "Your message is too long (5000 characters max)." }, { status: 400 });
    }

    await mailService.sendContactMessage({ fullName, email, purpose, message });

    return Response.json({ success: true, message: "Thanks — your message is on its way. We'll be in touch." });
  } catch (error) {
    console.error("[POST /api/contact]", error);
    return Response.json({ error: "Something went wrong sending your message. Try again." }, { status: 500 });
  }
}