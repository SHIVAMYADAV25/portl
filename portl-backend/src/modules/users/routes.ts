import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users, pushTokens } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";

const router = Router();

router.get("/:id", isAuthenticated, async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
  languagePref: z.string().optional(),
});

router.put("/:id", isAuthenticated, async (req, res) => {
  if (req.user!.sub !== req.params.id && req.user!.role !== "admin") {
    return res.status(403).json({ error: "You can only update your own profile" });
  }
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await db.update(users).set(parsed.data).where(eq(users.id, req.params.id));
  const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
  const { passwordHash, ...safe } = user;
  res.json({ user: safe });
});

// Admin-only resident directory management
router.get("/", isAuthenticated, checkRole("admin"), async (_req, res) => {
  const all = await db.select().from(users);
  res.json({ users: all.map(({ passwordHash, ...u }) => u) });
});

// Push token registration (called by the app after Notifications.getExpoPushTokenAsync)
const pushSchema = z.object({ expoPushToken: z.string().min(10) });

router.post("/me/push-token", isAuthenticated, async (req, res) => {
  const parsed = pushSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await db.select().from(pushTokens).where(eq(pushTokens.userId, req.user!.sub));
  if (existing.some((t) => t.expoPushToken === parsed.data.expoPushToken)) {
    return res.json({ ok: true });
  }
  await db.insert(pushTokens).values({ id: uuid(), userId: req.user!.sub, expoPushToken: parsed.data.expoPushToken });
  res.json({ ok: true });
});

export default router;
