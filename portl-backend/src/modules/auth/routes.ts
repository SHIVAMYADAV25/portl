import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { societies, users, invitations } from "../../db/schema";
import { hashPassword, comparePassword } from "../../utils/password";
import { signAccessToken, signRefreshToken, verifyToken } from "../../utils/jwt";
import { isAuthenticated } from "../../middleware/auth";
import { authLimiter, bootstrapLimiter, inviteLimiter } from "../../middleware/rateLimit";
import { hashInviteToken } from "../../utils/invite";

const router = Router();

async function toSafeUser(user: any) {
  const { passwordHash, ...safe } = user;
  const [society] = user.societyId ? await db.select().from(societies).where(eq(societies.id, user.societyId)) : [];
  return { ...safe, societyName: society?.name ?? null };
}

function issueSession(user: any) {
  const payload = { sub: user.id, role: user.role, societyId: user.societyId, flatId: user.flatId ?? undefined };
  return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) };
}

// ---------- 1. First society setup ----------
// Public by design (there's no society to belong to yet), but rate-limited harder than any other
// endpoint since it mints a brand-new tenant + an immediately-active admin session.
const bootstrapSchema = z.object({
  societyName: z.string().min(2),
  address: z.string().optional(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPhone: z.string().min(10).max(15),
  password: z.string().min(6),
});

router.post("/society/bootstrap", bootstrapLimiter, async (req, res) => {
  const parsed = bootstrapSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { societyName, address, adminName, adminEmail, adminPhone, password } = parsed.data;

  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));
  if (existingAdmin.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const societyId = uuid();
  await db.insert(societies).values({ id: societyId, name: societyName, address });

  const passwordHash = await hashPassword(password);
  const adminId = uuid();
  await db.insert(users).values({
    id: adminId,
    name: adminName,
    email: adminEmail,
    phone: adminPhone,
    passwordHash,
    role: "admin",
    status: "active", // nobody invited the founder — active the moment the society exists
    societyId,
  });

  const [user] = await db.select().from(users).where(eq(users.id, adminId));
  return res.status(201).json({ user: await toSafeUser(user), ...issueSession(user) });
});

// ---------- 6/8/10. Login — the one screen every role shares ----------
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Same generic error whether the email doesn't exist or the password is wrong — never reveal
  // which one, so this can't be used to check which emails are registered.
  if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  if (user.status === "pending_invitation") {
    return res.status(403).json({
      error: "Your account isn't activated yet. Check your email for the activation link.",
      code: "PENDING_INVITATION",
    });
  }
  if (user.status === "disabled") {
    return res.status(403).json({ error: "This account has been disabled. Contact your society admin.", code: "DISABLED" });
  }

  return res.json({ user: await toSafeUser(user), ...issueSession(user) });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });
  try {
    const payload = verifyToken(refreshToken);
    // Re-check status on every refresh — disabling someone takes effect immediately instead of
    // waiting for their refresh token to expire naturally.
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
    if (!user || user.status !== "active") return res.status(401).json({ error: "Session no longer valid" });
    const newPayload = { sub: user.id, role: user.role, societyId: user.societyId, flatId: user.flatId ?? undefined };
    return res.json({ accessToken: signAccessToken(newPayload) });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.get("/me", isAuthenticated, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.sub));
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: await toSafeUser(user) });
});

// ---------- 5/7/9. Activation (resident, guard, or additional admin — same flow for all) ----------
router.get("/invitations/:token", inviteLimiter, async (req, res) => {
  const tokenHash = hashInviteToken(req.params.token);
  const [invite] = await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash));
  if (!invite || invite.usedAt || new Date(invite.expiresAt) < new Date()) {
    return res.status(410).json({ error: "This invitation link is invalid or has expired. Ask your admin to resend it." });
  }
  const [user] = await db.select().from(users).where(eq(users.id, invite.userId));
  if (!user) return res.status(404).json({ error: "Invitation no longer valid" });
  const [society] = await db.select().from(societies).where(eq(societies.id, invite.societyId));

  return res.json({
    name: user.name,
    email: user.email,
    role: user.role,
    societyName: society?.name ?? "your society",
    flatLabel: user.flatLabel ?? null,
  });
});

const activateSchema = z.object({ password: z.string().min(6) });

router.post("/invitations/:token/activate", inviteLimiter, async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tokenHash = hashInviteToken(req.params.token);
  const [invite] = await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash));
  if (!invite || invite.usedAt || new Date(invite.expiresAt) < new Date()) {
    return res.status(410).json({ error: "This invitation link is invalid or has expired. Ask your admin to resend it." });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(users).set({ passwordHash, status: "active" }).where(eq(users.id, invite.userId));
  await db.update(invitations).set({ usedAt: new Date().toISOString() }).where(eq(invitations.id, invite.id));

  const [user] = await db.select().from(users).where(eq(users.id, invite.userId));
  return res.json({ user: await toSafeUser(user), ...issueSession(user) });
});

export default router;