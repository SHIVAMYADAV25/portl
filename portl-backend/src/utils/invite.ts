import crypto from "crypto";

/** How long an invitation link stays valid before the admin has to resend it. */
export const INVITATION_TTL_HOURS = 48;

/** Generates a fresh invite. The raw token goes out in the email/deep link and is never stored —
 *  only its SHA-256 hash is persisted, exactly like a password, so a DB leak alone can't be used
 *  to activate someone else's pending account. */
export function generateInviteToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(raw);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  return { raw, tokenHash, expiresAt };
}

export function hashInviteToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Builds the deep link that opens the Expo app straight to the activation screen. See
 *  app/(auth)/activate/[token].tsx on the mobile side — the "portl" scheme + this path maps
 *  directly to that route file via Expo Router's built-in deep linking. */
export function buildActivationLink(raw: string) {
  const base = process.env.APP_DEEP_LINK_BASE || "portl://activate";
  return `${base}/${raw}`;
}