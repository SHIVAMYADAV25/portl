import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { complaints, complaintComments, users } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";
import { socketEvents } from "../../socket";

const router = Router();

const createSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["Plumbing", "Electrical", "Security", "Housekeeping", "Parking", "Other"]),
  description: z.string().optional(),
});

router.post("/", isAuthenticated, checkRole("resident"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [me] = await db.select().from(users).where(eq(users.id, req.user!.sub));
  const id = uuid();
  const complaint = {
    id,
    ...parsed.data,
    status: "open" as const,
    raisedByUserId: req.user!.sub,
    flatLabel: me?.flatLabel ?? "—",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.insert(complaints).values(complaint);
  socketEvents.ticketUpdated(complaint);
  res.status(201).json({ complaint });
});

router.get("/", isAuthenticated, async (req, res) => {
  let rows = await db.select().from(complaints).orderBy(desc(complaints.createdAt));
  if (req.user!.role === "resident") {
    rows = rows.filter((c) => c.raisedByUserId === req.user!.sub);
  }
  const { status } = req.query as { status?: string };
  if (status) rows = rows.filter((c) => c.status === status);
  res.json({ complaints: rows });
});

const updateSchema = z.object({
  status: z.enum(["open", "assigned", "in_progress", "resolved", "closed"]).optional(),
  assignedTo: z.string().optional(),
});

router.put("/:id", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await db
    .update(complaints)
    .set({ ...parsed.data, updatedAt: new Date().toISOString() })
    .where(eq(complaints.id, req.params.id));

  const [updated] = await db.select().from(complaints).where(eq(complaints.id, req.params.id));
  if (!updated) return res.status(404).json({ error: "Complaint not found" });
  socketEvents.ticketUpdated(updated);
  res.json({ complaint: updated });
});

// ---------- Comment thread on a ticket (admin notes, resident follow-ups) ----------
router.get("/:id/comments", isAuthenticated, async (req, res) => {
  const [complaint] = await db.select().from(complaints).where(eq(complaints.id, req.params.id));
  if (!complaint) return res.status(404).json({ error: "Complaint not found" });
  if (req.user!.role === "resident" && complaint.raisedByUserId !== req.user!.sub) {
    return res.status(403).json({ error: "You can only view comments on your own tickets" });
  }
  const rows = await db
    .select()
    .from(complaintComments)
    .where(eq(complaintComments.complaintId, req.params.id))
    .orderBy(complaintComments.createdAt);
  res.json({ comments: rows });
});

const addCommentSchema = z.object({ body: z.string().min(1) });

router.post("/:id/comments", isAuthenticated, async (req, res) => {
  const parsed = addCommentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [complaint] = await db.select().from(complaints).where(eq(complaints.id, req.params.id));
  if (!complaint) return res.status(404).json({ error: "Complaint not found" });
  if (req.user!.role === "resident" && complaint.raisedByUserId !== req.user!.sub) {
    return res.status(403).json({ error: "You can only comment on your own tickets" });
  }

  const [me] = await db.select().from(users).where(eq(users.id, req.user!.sub));
  const id = uuid();
  const comment = {
    id,
    complaintId: req.params.id,
    authorUserId: req.user!.sub,
    authorName: me?.name ?? "Someone",
    authorRole: req.user!.role,
    body: parsed.data.body,
    createdAt: new Date().toISOString(),
  };
  await db.insert(complaintComments).values(comment);
  socketEvents.ticketUpdated(complaint); // nudges open clients to refetch the ticket + thread
  res.status(201).json({ comment });
});

export default router;