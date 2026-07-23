import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { notices } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";
import { socketEvents } from "../../socket";
import { notifyAllUsers } from "../notifications";

const router = Router();

router.get("/", isAuthenticated, async (_req, res) => {
  const rows = await db.select().from(notices).orderBy(desc(notices.createdAt));
  res.json({ notices: rows });
});

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  category: z.enum(["Maintenance", "Event", "Alert", "General"]).default("General"),
  pinned: z.boolean().optional(),
});

router.post("/", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = uuid();
  const notice = { id, ...parsed.data, createdByUserId: req.user!.sub, createdAt: new Date().toISOString() };
  await db.insert(notices).values(notice);

  socketEvents.newNotice(notice);
  // Society-wide: every user gets an in-app inbox row, and whoever has a push token also gets
  // an OS push. Notices are the one broadcast-to-everyone event in the app.
  await notifyAllUsers(notice.title, notice.body.slice(0, 120), "notice", { noticeId: id });

  res.status(201).json({ notice });
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  category: z.enum(["Maintenance", "Event", "Alert", "General"]).optional(),
  pinned: z.boolean().optional(),
});

router.put("/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [existing] = await db.select().from(notices).where(eq(notices.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Notice not found" });
  await db.update(notices).set(parsed.data).where(eq(notices.id, req.params.id));
  const [updated] = await db.select().from(notices).where(eq(notices.id, req.params.id));
  res.json({ notice: updated });
});

router.delete("/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const [existing] = await db.select().from(notices).where(eq(notices.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Notice not found" });
  await db.delete(notices).where(eq(notices.id, req.params.id));
  res.json({ ok: true });
});

export default router;