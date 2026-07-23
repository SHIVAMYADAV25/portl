import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { amenities } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";

const router = Router();

router.get("/", isAuthenticated, async (_req, res) => {
  const rows = await db.select().from(amenities);
  res.json({ amenities: rows });
});

const createSchema = z.object({
  name: z.string().min(1),
  icon: z.string().default("grid"),
  location: z.string().optional(),
  openTime: z.string().default("06:00"),
  closeTime: z.string().default("22:00"),
  slotMinutes: z.number().default(60),
});

router.post("/", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuid();
  await db.insert(amenities).values({ id, ...parsed.data });
  res.status(201).json({ id });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  location: z.string().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  slotMinutes: z.number().optional(),
});

router.put("/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [existing] = await db.select().from(amenities).where(eq(amenities.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Amenity not found" });
  await db.update(amenities).set(parsed.data).where(eq(amenities.id, req.params.id));
  const [updated] = await db.select().from(amenities).where(eq(amenities.id, req.params.id));
  res.json({ amenity: updated });
});

router.delete("/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  await db.delete(amenities).where(eq(amenities.id, req.params.id));
  res.json({ ok: true });
});

export default router;