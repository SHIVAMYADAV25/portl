import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db";
import { notifications } from "../../db/schema";
import { isAuthenticated } from "../../middleware/auth";

const router = Router();

// Always scoped to the requesting user — nobody can list/mark another user's notifications.
router.get("/", isAuthenticated, async (req, res) => {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, req.user!.sub))
    .orderBy(desc(notifications.createdAt));

  res.json({
    notifications: (rows as any[]).map((n) => ({ ...n, meta: n.meta ? JSON.parse(n.meta) : null })),
  });
});

router.get("/unread-count", isAuthenticated, async (req, res) => {
  const rows = await db.select().from(notifications).where(eq(notifications.userId, req.user!.sub));
  const count = (rows as any[]).filter((n) => !n.read).length;
  res.json({ count });
});

router.post("/:id/read", isAuthenticated, async (req, res) => {
  const [existing] = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user!.sub)));
  if (!existing) return res.status(404).json({ error: "Notification not found" });

  await db.update(notifications).set({ read: true }).where(eq(notifications.id, req.params.id));
  res.json({ ok: true });
});

router.post("/read-all", isAuthenticated, async (req, res) => {
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, req.user!.sub));
  res.json({ ok: true });
});

export default router;
