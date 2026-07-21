import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { societies, towers, flats } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";

const router = Router();

// This app is single-society (see seed.ts) — there's no "switch society" UI anywhere, so rather
// than requiring every caller to know/pass a societyId, towers auto-attach to whichever society
// already exists, creating a default one on first use if somehow none does (fresh DB, seed never
// run). Multi-society support would mean threading societyId through auth/JWT — out of scope here.
async function getOrCreateDefaultSocietyId(): Promise<string> {
  const [existing] = await db.select().from(societies).limit(1);
  if (existing) return existing.id;
  const id = uuid();
  await db.insert(societies).values({ id, name: "My Society" });
  return id;
}

// ---------- Towers ----------

// Any authenticated user can list towers/flats — needed so the guard's visitor-registration
// screen can autocomplete against real flats instead of a free-text field (see register.tsx).
router.get("/towers", isAuthenticated, async (_req, res) => {
  const rows = await db.select().from(towers);
  res.json({ towers: rows });
});

const createTowerSchema = z.object({ name: z.string().min(1) });

router.post("/towers", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createTowerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const societyId = await getOrCreateDefaultSocietyId();
  const id = uuid();
  await db.insert(towers).values({ id, societyId, name: parsed.data.name });
  res.status(201).json({ id });
});

router.put("/towers/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createTowerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [existing] = await db.select().from(towers).where(eq(towers.id, req.params.id));
  if (!existing) return res.status(404).json({ error: "Tower not found" });
  await db.update(towers).set({ name: parsed.data.name }).where(eq(towers.id, req.params.id));
  res.json({ ok: true });
});

router.delete("/towers/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
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
  const rows = towerId
    ? await db.select().from(flats).where(eq(flats.towerId, towerId))
    : await db.select().from(flats);
  res.json({ flats: rows });
});

const createFlatSchema = z.object({
  towerId: z.string().min(1),
  number: z.string().min(1),
  label: z.string().min(1), // e.g. "A-1005" — this is the same string used elsewhere as flatLabel
  ownerName: z.string().optional(),
});

router.post("/flats", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createFlatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [tower] = await db.select().from(towers).where(eq(towers.id, parsed.data.towerId));
  if (!tower) return res.status(400).json({ error: "towerId does not match an existing tower" });
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
  await db.update(flats).set(parsed.data).where(eq(flats.id, req.params.id));
  res.json({ ok: true });
});

router.delete("/flats/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  await db.delete(flats).where(eq(flats.id, req.params.id));
  res.json({ ok: true });
});

export default router;
