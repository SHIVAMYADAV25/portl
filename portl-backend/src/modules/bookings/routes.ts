import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { bookings, users } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";

const router = Router();

router.get("/", isAuthenticated, async (req, res) => {
  const { flatLabel, amenityId, date } = req.query as { flatLabel?: string; amenityId?: string; date?: string };
  let rows = await db.select().from(bookings);
  if (flatLabel) rows = rows.filter((b) => b.flatLabel === flatLabel);
  if (amenityId) rows = rows.filter((b) => b.amenityId === amenityId);
  if (date) rows = rows.filter((b) => b.date === date);
  res.json({ bookings: rows });
});

const createSchema = z.object({
  amenityId: z.string(),
  date: z.string(), // yyyy-mm-dd
  startTime: z.string(),
  endTime: z.string(),
});

router.post("/", isAuthenticated, checkRole("resident"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { amenityId, date, startTime, endTime } = parsed.data;

  // Prevent double-booking: reject if any confirmed booking overlaps this exact slot.
  const existing = await db.select().from(bookings).where(
    and(eq(bookings.amenityId, amenityId), eq(bookings.date, date), eq(bookings.startTime, startTime), eq(bookings.status, "confirmed"))
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: "This slot was just taken. Please pick another." });
  }

  const [me] = await db.select().from(users).where(eq(users.id, req.user!.sub));
  const id = uuid();
  await db.insert(bookings).values({
    id,
    amenityId,
    date,
    startTime,
    endTime,
    flatLabel: me?.flatLabel ?? "—",
    bookedByUserId: req.user!.sub,
    status: "confirmed",
  });
  res.status(201).json({ id });
});

router.delete("/:id", isAuthenticated, async (req, res) => {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, req.params.id));
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.bookedByUserId !== req.user!.sub && req.user!.role !== "admin") {
    return res.status(403).json({ error: "You can only cancel your own bookings" });
  }
  await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, req.params.id));
  res.json({ ok: true });
});

export default router;
