import twilio from "twilio";

let client: ReturnType<typeof twilio> | null = null;
let initialized = false;

function getClient() {
  if (initialized) return client;
  initialized = true;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
}

export function isTwilioConfigured() {
  return Boolean(getClient() && process.env.TWILIO_VERIFY_SERVICE_SID);
}

/** Sends a real SMS OTP via Twilio Verify. Returns false (never throws) if Twilio isn't
 *  configured or the request fails, so callers can fall back to the demo OTP flow. */
export async function sendOtp(phoneE164: string): Promise<boolean> {
  const c = getClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!c || !serviceSid) return false;
  try {
    await c.verify.v2.services(serviceSid).verifications.create({ to: phoneE164, channel: "sms" });
    return true;
  } catch (err) {
    console.warn("[twilio] Failed to send OTP:", (err as Error).message);
    return false;
  }
}

/** Verifies a real OTP via Twilio Verify. Returns null (not false) if Twilio isn't configured or
 *  unreachable, so the caller can distinguish "couldn't check" from "checked, and it's wrong". */
export async function checkOtp(phoneE164: string, code: string): Promise<boolean | null> {
  const c = getClient();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!c || !serviceSid) return null;
  try {
    const check = await c.verify.v2.services(serviceSid).verificationChecks.create({ to: phoneE164, code });
    return check.status === "approved";
  } catch (err) {
    console.warn("[twilio] Failed to verify OTP:", (err as Error).message);
    return null;
  }
}

/** Twilio Verify wants E.164 (+91XXXXXXXXXX). The app sends plain 10-digit Indian numbers, so
 *  default to the +91 country code — swap this if you're deploying outside India. */
export function toE164(phone: string) {
  if (phone.startsWith("+")) return phone;
  return `+91${phone}`;
}
