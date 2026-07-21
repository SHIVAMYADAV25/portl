import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { visitors, users, guestPasses } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";
import { socketEvents } from "../../socket";
import { notifyUser } from "../notifications";

const router = Router();

// ---------- Guard registers a visitor ----------
const registerSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["guest", "delivery", "cab", "service", "other"]),
  company: z.string().optional(),
  purpose: z.string().optional(),
  flatLabel: z.string().min(1),
  towerName: z.string().optional(),
});

router.post("/", isAuthenticated, checkRole("guard"), async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = uuid();
  const visitor = {
    id,
    ...parsed.data,
    status: "pending" as const,
    registeredByGuardId: req.user!.sub,
    requestedAt: new Date().toISOString(),
  };
  await db.insert(visitors).values(visitor);

  // Notify the resident(s) of that flat in real time + push + in-app inbox.
  socketEvents.visitorRequest(parsed.data.flatLabel, visitor);
  const residents = await db.select().from(users).where(eq(users.flatLabel, parsed.data.flatLabel));
  await Promise.all(
    (residents as any[]).map((r) =>
      notifyUser(
        r.id,
        `${visitor.name} is waiting at the gate`,
        visitor.purpose || visitor.company || "Tap to approve or deny",
        "visitor",
        { visitorId: id }
      )
    )
  );

  res.status(201).json({ visitor });
});

// ---------- Resident approves / rejects ----------
router.post("/:id/approve", isAuthenticated, checkRole("resident"), async (req, res) => {
  const [visitor] = await db.select().from(visitors).where(eq(visitors.id, req.params.id));
  if (!visitor) return res.status(404).json({ error: "Visitor not found" });

  await db.update(visitors).set({ status: "approved", approvedByUserId: req.user!.sub }).where(eq(visitors.id, req.params.id));
  const [updated] = await db.select().from(visitors).where(eq(visitors.id, req.params.id));

  socketEvents.visitorApproved(updated);
  res.json({ visitor: updated });
});

router.post("/:id/reject", isAuthenticated, checkRole("resident"), async (req, res) => {
  const [visitor] = await db.select().from(visitors).where(eq(visitors.id, req.params.id));
  if (!visitor) return res.status(404).json({ error: "Visitor not found" });

  await db.update(visitors).set({ status: "rejected", approvedByUserId: req.user!.sub }).where(eq(visitors.id, req.params.id));
  const [updated] = await db.select().from(visitors).where(eq(visitors.id, req.params.id));

  socketEvents.visitorRejected(updated);
  res.json({ visitor: updated });
});

// ---------- Guard marks entry / exit ----------
router.post("/:id/entry", isAuthenticated, checkRole("guard"), async (req, res) => {
  await db.update(visitors).set({ status: "arrived", entryTime: new Date().toISOString() }).where(eq(visitors.id, req.params.id));
  const [updated] = await db.select().from(visitors).where(eq(visitors.id, req.params.id));
  if (!updated) return res.status(404).json({ error: "Visitor not found" });
  socketEvents.visitorEntered(updated.flatLabel, updated);
  res.json({ visitor: updated });
});

router.post("/:id/exit", isAuthenticated, checkRole("guard"), async (req, res) => {
  await db.update(visitors).set({ status: "exited", exitTime: new Date().toISOString() }).where(eq(visitors.id, req.params.id));
  const [updated] = await db.select().from(visitors).where(eq(visitors.id, req.params.id));
  if (!updated) return res.status(404).json({ error: "Visitor not found" });
  socketEvents.visitorExited(updated.flatLabel, updated);
  res.json({ visitor: updated });
});

// ---------- History / listing ----------
router.get("/", isAuthenticated, async (req, res) => {
  const { flatLabel, status } = req.query as { flatLabel?: string; status?: string };
  let rows = await db.select().from(visitors).orderBy(desc(visitors.requestedAt));

  // Residents only ever see their own flat's visitors.
  if (req.user!.role === "resident") {
    const [me] = await db.select().from(users).where(eq(users.id, req.user!.sub));
    rows = rows.filter((v) => v.flatLabel === me?.flatLabel);
  } else if (flatLabel) {
    rows = rows.filter((v) => v.flatLabel === flatLabel);
  }
  if (status) rows = rows.filter((v) => v.status === status);

  res.json({ visitors: rows });
});

router.get("/:id", isAuthenticated, async (req, res) => {
  const [visitor] = await db.select().from(visitors).where(eq(visitors.id, req.params.id));
  if (!visitor) return res.status(404).json({ error: "Visitor not found" });
  res.json({ visitor });
});

// ---------- Guest pre-approval / QR pass ----------
const passSchema = z.object({
  guestName: z.string().min(1),
  note: z.string().optional(),
  validHours: z.number().min(1).max(72).default(4),
  flatLabel: z.string(),
});

router.post("/guest-pass", isAuthenticated, checkRole("resident"), async (req, res) => {
  const parsed = passSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const id = uuid();
  const code = "PORTL-" + id.slice(0, 6).toUpperCase();
  const validFrom = new Date().toISOString();
  const validTo = new Date(Date.now() + parsed.data.validHours * 3_600_000).toISOString();

  await db.insert(guestPasses).values({
    id,
    code,
    generatedByUserId: req.user!.sub,
    guestName: parsed.data.guestName,
    note: parsed.data.note,
    validFrom,
    validTo,
    flatLabel: parsed.data.flatLabel,
  });

  res.status(201).json({ pass: { id, code, guestName: parsed.data.guestName, validFrom, validTo, flatLabel: parsed.data.flatLabel } });
});

// Guard scans a QR pass — validates + auto-registers/approves the visitor.
router.get("/guest-pass/:code", isAuthenticated, checkRole("guard"), async (req, res) => {
  const [pass] = await db.select().from(guestPasses).where(eq(guestPasses.code, req.params.code));
  if (!pass) return res.status(404).json({ error: "Pass not found" });
  if (pass.used) return res.status(409).json({ error: "Pass already used" });
  if (new Date(pass.validTo).getTime() < Date.now()) return res.status(410).json({ error: "Pass expired" });

  await db.update(guestPasses).set({ used: true }).where(eq(guestPasses.id, pass.id));

  const visitorId = uuid();
  const visitor = {
    id: visitorId,
    name: pass.guestName,
    category: "guest" as const,
    purpose: pass.note ?? "Pre-approved guest",
    flatLabel: pass.flatLabel,
    status: "approved" as const,
    registeredByGuardId: req.user!.sub,
    approvedByUserId: pass.generatedByUserId,
    requestedAt: new Date().toISOString(),
  };
  await db.insert(visitors).values(visitor);

  res.json({ pass, visitor });
});

export default router;
