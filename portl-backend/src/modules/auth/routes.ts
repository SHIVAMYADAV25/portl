import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { hashPassword, comparePassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyToken } from "../../utils/jwt";
import { isAuthenticated } from "../../middleware/auth";
import { sendOtp, checkOtp, isTwilioConfigured, toE164 } from "../../utils/twilio";
import { authLimiter, otpLimiter } from "../../middleware/rateLimit";

const router = Router();

// Fallback OTP used whenever Twilio isn't configured (no TWILIO_* env vars set) — keeps the app
// fully demoable with zero external accounts. When Twilio *is* configured, this code is never
// accepted; real SMS codes are required instead. See utils/twilio.ts.
const DEMO_OTP = "1234";

const signupSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10).max(15),
  password: z.string().min(4),
  role: z.enum(["resident", "guard", "admin"]),
  flatLabel: z.string().optional(),
  towerName: z.string().optional(),
});

router.post("/signup", authLimiter, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, phone, password, role, flatLabel, towerName } = parsed.data;

  const existing = await db.select().from(users).where(eq(users.phone, phone));
  if (existing.length > 0) return res.status(409).json({ error: "Phone number already registered" });

  const passwordHash = await hashPassword(password);
  const id = uuid();
  await db.insert(users).values({ id, name, phone, passwordHash, role, flatLabel, towerName });

  const payload = { sub: id, role, phone };
  return res.status(201).json({
    user: { id, name, phone, role, flatLabel, towerName },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  });
});

const loginSchema = z.object({ phone: z.string().min(10), password: z.string().min(1) });

router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { phone, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.phone, phone));
  if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid phone or password" });

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid phone or password" });

  const payload = { sub: user.id, role: user.role as any, phone: user.phone };
  return res.json({
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, flatLabel: user.flatLabel, towerName: user.towerName },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  });
});

// ---------- Real SMS OTP (Twilio Verify), step 1: send the code ----------
const requestOtpSchema = z.object({ phone: z.string().min(10) });

router.post("/request-otp", otpLimiter, async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (!isTwilioConfigured()) {
    // No SMS provider configured — the client should just show "Demo OTP: 1234" and skip
    // waiting for a text message. Not an error; this is the expected zero-setup path.
    return res.json({ sent: false, demoMode: true });
  }

  const ok = await sendOtp(toE164(parsed.data.phone));
  if (!ok) return res.status(503).json({ error: "Could not send SMS right now. Try again shortly." });
  return res.json({ sent: true, demoMode: false });
});

// ---------- Step 2: verify the code (real via Twilio if configured, else the demo code) ----------
// Matches the mobile app's welcome -> phone -> OTP screens. Auto-provisions a new resident on
// first use of an unrecognized phone number, so the demo works against any number/role.
const otpSchema = z.object({ phone: z.string().min(10), otp: z.string().min(4).max(8), role: z.enum(["resident", "guard", "admin"]).optional() });

router.post("/verify-otp", otpLimiter, async (req, res) => {
  const parsed = otpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { phone, otp, role } = parsed.data;

  const twilioResult = await checkOtp(toE164(phone), otp);
  if (twilioResult === false) return res.status(401).json({ error: "Incorrect OTP" });
  if (twilioResult === null) {
    // Twilio not configured (or unreachable) — fall back to the fixed demo code.
    if (otp !== DEMO_OTP) return res.status(401).json({ error: "Incorrect OTP" });
  }

  let [user] = await db.select().from(users).where(eq(users.phone, phone));
  if (!user) {
    // Auto-provision so the mobile demo works against any phone number, any role.
    const id = uuid();
    await db.insert(users).values({
      id,
      name: "New Resident",
      phone,
      role: role ?? "resident",
      flatLabel: role === "resident" ? "A-000" : undefined,
      towerName: "Tower A",
    });
    [user] = await db.select().from(users).where(eq(users.id, id));
  }

  const payload = { sub: user.id, role: user.role as any, phone: user.phone };
  return res.json({
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role, flatLabel: user.flatLabel, towerName: user.towerName },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });
  try {
    const payload = verifyToken(refreshToken);
    const newPayload = { sub: payload.sub, role: payload.role, phone: payload.phone };
    return res.json({ accessToken: signAccessToken(newPayload) });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.get("/me", isAuthenticated, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.sub));
  if (!user) return res.status(404).json({ error: "User not found" });
  const { passwordHash, ...safe } = user;
  return res.json({ user: safe });
});

export default router;
