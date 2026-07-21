import nodemailer from "nodemailer";

// Mirrors utils/twilio.ts's DEMO_OTP pattern: if SMTP isn't configured, invites/activation still
// work end-to-end in a zero-setup local/demo environment — we just log the email to the console
// (and the caller can surface the activation link directly in the API response/UI) instead of
// failing the request. Configure SMTP_* to send real email.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@portl.app";

export function isEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!isEmailConfigured()) {
    console.log(
      `\n===== [DEMO EMAIL] (SMTP not configured) =====\nTo: ${to}\nSubject: ${subject}\n\n${text}\n================================================\n`
    );
    return { sent: false, demoMode: true };
  }
  await getTransporter().sendMail({ from: FROM_EMAIL, to, subject, html, text });
  return { sent: true, demoMode: false };
}