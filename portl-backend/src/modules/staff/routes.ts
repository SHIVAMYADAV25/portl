import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { staff } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";

const router = Router();

router.get("/", isAuthenticated, async (_req, res) => {
  const rows = await db.select().from(staff);
  res.json({ staff: rows });
});

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(6),
  rating: z.number().min(0).max(5).optional(),
  photoUrl: z.string().url().optional(),
});

router.post("/", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuid();
  await db.insert(staff).values({ id, ...parsed.data });
  res.status(201).json({ id });
});

router.delete("/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  await db.delete(staff).where(eq(staff.id, req.params.id));
  res.json({ ok: true });
});

export default router;
