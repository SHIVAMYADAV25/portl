import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../db";
import { towers, flats } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";

const router = Router();

// ---------- Towers ----------
// Any authenticated user can list towers/flats — needed for the guard's visitor-registration
// screen and the admin's invite-resident screen. Always scoped to the caller's own society via
// req.user!.societyId from the verified JWT — never a client-supplied value.

router.get("/towers", isAuthenticated, async (req, res) => {
  const rows = await db.select().from(towers).where(eq(towers.societyId, req.user!.societyId));
  res.json({ towers: rows });
});

const createTowerSchema = z.object({ name: z.string().min(1) });

router.post("/towers", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createTowerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuid();
  await db.insert(towers).values({ id, societyId: req.user!.societyId, name: parsed.data.name });
  res.status(201).json({ id });
});

router.put("/towers/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createTowerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [existing] = await db.select().from(towers).where(and(eq(towers.id, req.params.id), eq(towers.societyId, req.user!.societyId)));
  if (!existing) return res.status(404).json({ error: "Tower not found" });
  await db.update(towers).set({ name: parsed.data.name }).where(eq(towers.id, req.params.id));
  res.json({ ok: true });
});

router.delete("/towers/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const [existing] = await db.select().from(towers).where(and(eq(towers.id, req.params.id), eq(towers.societyId, req.user!.societyId)));
  if (!existing) return res.status(404).json({ error: "Tower not found" });
  const flatsInTower = await db.select().from(flats).where(eq(flats.towerId, req.params.id));
  if (flatsInTower.length > 0) {
    return res.status(409).json({ error: `Cannot delete — ${flatsInTower.length} flat(s) still assigned to this tower` });
  }
  await db.delete(towers).where(eq(towers.id, req.params.id));
  res.json({ ok: true });
});

// ---------- Flats ----------

router.get("/flats", isAuthenticated, async (req, res) => {
  const { towerId } = req.query as { towerId?: string };
  const societyTowers = await db.select().from(towers).where(eq(towers.societyId, req.user!.societyId));
  const towerIds = societyTowers.map((t: any) => t.id);

  if (towerId) {
    if (!towerIds.includes(towerId)) return res.status(403).json({ error: "That tower isn't in your society" });
    const rows = await db.select().from(flats).where(eq(flats.towerId, towerId));
    return res.json({ flats: rows });
  }
  if (towerIds.length === 0) return res.json({ flats: [] });
  const rows = await db.select().from(flats).where(inArray(flats.towerId, towerIds));
  res.json({ flats: rows });
});

const createFlatSchema = z.object({
  towerId: z.string().min(1),
  number: z.string().min(1),
  label: z.string().min(1),
  ownerName: z.string().optional(),
});

router.post("/flats", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createFlatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [tower] = await db.select().from(towers).where(and(eq(towers.id, parsed.data.towerId), eq(towers.societyId, req.user!.societyId)));
  if (!tower) return res.status(400).json({ error: "towerId does not match a tower in your society" });
  const id = uuid();
  await db.insert(flats).values({ id, ...parsed.data });
  res.status(201).json({ id });
});

const updateFlatSchema = z.object({
  number: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  ownerName: z.string().optional(),
});

router.put("/flats/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = updateFlatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [existing] = await db.select().from(flats).where(eq(flats.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Flat not found" });
  const [tower] = await db.select().from(towers).where(and(eq(towers.id, existing.towerId), eq(towers.societyId, req.user!.societyId)));
  if (!tower) return res.status(404).json({ error: "Flat not found" });
  await db.update(flats).set(parsed.data).where(eq(flats.id, req.params.id));
  res.json({ ok: true });
});

router.delete("/flats/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const [existing] = await db.select().from(flats).where(eq(flats.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Flat not found" });
  const [tower] = await db.select().from(towers).where(and(eq(towers.id, existing.towerId), eq(towers.societyId, req.user!.societyId)));
  if (!tower) return res.status(404).json({ error: "Flat not found" });
  await db.delete(flats).where(eq(flats.id, req.params.id));
  res.json({ ok: true });
});

export default router;