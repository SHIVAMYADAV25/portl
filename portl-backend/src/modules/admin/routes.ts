import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { users, flats, towers, invitations, societies, visitors, complaints, bookings, notices } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";
import { generateInviteToken, hashInviteToken, buildActivationLink, INVITATION_TTL_HOURS } from "../../utils/invite";
import { sendEmail } from "../../utils/email";
import { inviteLimiter } from "../../middleware/rateLimit";

const router = Router();

// Every route below is admin-only and implicitly scoped to the caller's own society —
// req.user!.societyId comes from the verified JWT, never the request body, so an admin can never
// invite, list, or edit users belonging to a different society.
router.use(isAuthenticated, checkRole("admin"));

async function issueInvitation(userId: string, societyId: string, name: string, email: string, societyName: string, role: string) {
  const { raw, tokenHash, expiresAt } = generateInviteToken();
  await db.insert(invitations).values({ id: uuid(), userId, societyId, tokenHash, expiresAt });
  const link = buildActivationLink(raw);
  const roleLabel = role === "guard" ? "Security Guard" : role === "admin" ? "Society Admin" : "Resident";
  const { demoMode } = await sendEmail(
    email,
    `You're invited to ${societyName} on Portl`,
    `<p>Hello ${name},</p><p>You've been added as a <b>${roleLabel}</b> for <b>${societyName}</b> on Portl.</p><p><a href="${link}">Activate your account</a></p><p>This invitation expires in ${INVITATION_TTL_HOURS} hours.</p>`,
    `Hello ${name},\n\nYou've been added as a ${roleLabel} for ${societyName} on Portl.\n\nActivate your account: ${link}\n\nThis invitation expires in ${INVITATION_TTL_HOURS} hours.`
  );
  // Only surface the raw link in the API response when email isn't actually configured — this is
  // the same "demo mode" idea as DEMO_OTP elsewhere in the app, never returned once real SMTP is set.
  return demoMode ? link : undefined;
}

async function createInvitedUser(params: {
  societyId: string;
  invitedBy: string;
  name: string;
  email: string;
  phone: string;
  role: "resident" | "guard" | "admin";
  flatId?: string;
  flatLabel?: string;
  towerName?: string;
  ownerOrTenant?: "owner" | "tenant";
  gate?: string;
  shift?: string;
}) {
  const existing = await db.select().from(users).where(eq(users.email, params.email));
  if (existing.length > 0) return { error: "Someone with this email already has a Portl account" as const };

  const id = uuid();
  await db.insert(users).values({
    id,
    name: params.name,
    email: params.email,
    phone: params.phone,
    role: params.role,
    status: "pending_invitation",
    societyId: params.societyId,
    invitedByUserId: params.invitedBy,
    flatId: params.flatId,
    flatLabel: params.flatLabel,
    towerName: params.towerName,
    ownerOrTenant: params.ownerOrTenant,
    gate: params.gate,
    shift: params.shift,
  });

  const [society] = await db.select().from(societies).where(eq(societies.id, params.societyId));
  const activationLink = await issueInvitation(id, params.societyId, params.name, params.email, society?.name ?? "your society", params.role);

  const [user] = await db.select().from(users).where(eq(users.id, id));
  const { passwordHash, ...safe } = user;
  return { user: safe, activationLink };
}

// ---------- 4. Invite a resident ----------
const inviteResidentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  flatId: z.string().min(1),
  ownerOrTenant: z.enum(["owner", "tenant"]).default("owner"),
});

router.post("/residents", inviteLimiter, async (req, res) => {
  const parsed = inviteResidentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, phone, flatId, ownerOrTenant } = parsed.data;
  const societyId = req.user!.societyId;

  const [flat] = await db.select().from(flats).where(eq(flats.id, flatId));
  if (!flat) return res.status(400).json({ error: "That flat doesn't exist" });
  const [tower] = await db.select().from(towers).where(eq(towers.id, flat.towerId));
  if (!tower || tower.societyId !== societyId) {
    return res.status(400).json({ error: "That flat doesn't belong to your society" });
  }

  const occupants = await db.select().from(users).where(and(eq(users.flatId, flatId), eq(users.role, "resident")));
  const activeOccupant = occupants.find((u: any) => u.status !== "disabled");
  if (activeOccupant) {
    return res.status(409).json({ error: `Flat ${flat.label} is already assigned to ${activeOccupant.name}` });
  }

  const result = await createInvitedUser({
    societyId, invitedBy: req.user!.sub, name, email, phone, role: "resident",
    flatId, flatLabel: flat.label, towerName: tower.name, ownerOrTenant,
  });
  if ("error" in result) return res.status(409).json({ error: result.error });
  res.status(201).json(result);
});

// ---------- 7. Invite a security guard ----------
const inviteGuardSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  gate: z.string().min(1),
  shift: z.enum(["morning", "evening", "night"]).default("morning"),
});

router.post("/guards", inviteLimiter, async (req, res) => {
  const parsed = inviteGuardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, phone, gate, shift } = parsed.data;

  const result = await createInvitedUser({
    societyId: req.user!.societyId, invitedBy: req.user!.sub, name, email, phone, role: "guard", gate, shift,
  });
  if ("error" in result) return res.status(409).json({ error: result.error });
  res.status(201).json(result);
});

// ---------- 9. Invite an additional admin ----------
const inviteAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
});

router.post("/admins", inviteLimiter, async (req, res) => {
  const parsed = inviteAdminSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, phone } = parsed.data;

  const result = await createInvitedUser({
    societyId: req.user!.societyId, invitedBy: req.user!.sub, name, email, phone, role: "admin",
  });
  if ("error" in result) return res.status(409).json({ error: result.error });
  res.status(201).json(result);
});

// ---------- People directory (pending + active + disabled), scoped to the caller's society ----------
router.get("/people", async (req, res) => {
  const all = await db.select().from(users).where(eq(users.societyId, req.user!.societyId));
  res.json({ people: all.map(({ passwordHash, ...u }: any) => u) });
});

// ---------- Resend an invite — old token stops mattering, a fresh row + link replace it ----------
router.post("/people/:id/resend-invite", inviteLimiter, async (req, res) => {
  const [user] = await db.select().from(users).where(and(eq(users.id, req.params.id), eq(users.societyId, req.user!.societyId)));
  if (!user) return res.status(404).json({ error: "Person not found" });
  if (user.status !== "pending_invitation") {
    return res.status(400).json({ error: "This person has already activated their account" });
  }
  const [society] = await db.select().from(societies).where(eq(societies.id, req.user!.societyId));
  const activationLink = await issueInvitation(user.id, req.user!.societyId, user.name, user.email, society?.name ?? "your society", user.role);
  res.json({ ok: true, activationLink });
});

// ---------- Disable / re-enable — soft, keeps their history intact ----------
const statusSchema = z.object({ status: z.enum(["active", "disabled"]) });

router.put("/people/:id/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const [user] = await db.select().from(users).where(and(eq(users.id, req.params.id), eq(users.societyId, req.user!.societyId)));
  if (!user) return res.status(404).json({ error: "Person not found" });
  if (user.id === req.user!.sub) return res.status(400).json({ error: "You can't disable your own account" });

  if (user.role === "admin" && parsed.data.status === "disabled") {
    const activeAdmins = await db
      .select()
      .from(users)
      .where(and(eq(users.societyId, req.user!.societyId), eq(users.role, "admin"), eq(users.status, "active")));
    if (activeAdmins.length <= 1) {
      return res.status(400).json({ error: "A society must always have at least one active admin" });
    }
  }

  await db.update(users).set({ status: parsed.data.status }).where(eq(users.id, req.params.id));
  res.json({ ok: true });
});

// ---------- Edit resident details (flat reassignment, owner/tenant, contact info) ----------
const editResidentSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).max(15).optional(),
  flatId: z.string().min(1).optional(),
  ownerOrTenant: z.enum(["owner", "tenant"]).optional(),
});

router.put("/residents/:id", async (req, res) => {
  const parsed = editResidentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [existing] = await db.select().from(users).where(and(eq(users.id, req.params.id), eq(users.societyId, req.user!.societyId)));
  if (!existing || existing.role !== "resident") return res.status(404).json({ error: "Resident not found" });

  const patch: Record<string, unknown> = {};
  if (parsed.data.name) patch.name = parsed.data.name;
  if (parsed.data.phone) patch.phone = parsed.data.phone;
  if (parsed.data.ownerOrTenant) patch.ownerOrTenant = parsed.data.ownerOrTenant;

  if (parsed.data.flatId) {
    const [flat] = await db.select().from(flats).where(eq(flats.id, parsed.data.flatId));
    if (!flat) return res.status(400).json({ error: "That flat doesn't exist" });
    const [tower] = await db.select().from(towers).where(eq(towers.id, flat.towerId));
    if (!tower || tower.societyId !== req.user!.societyId) {
      return res.status(400).json({ error: "That flat doesn't belong to your society" });
    }
    const occupants = await db.select().from(users).where(and(eq(users.flatId, parsed.data.flatId), eq(users.role, "resident")));
    const activeOccupant = occupants.find((u: any) => u.status !== "disabled" && u.id !== existing.id);
    if (activeOccupant) return res.status(409).json({ error: `Flat ${flat.label} is already assigned to ${activeOccupant.name}` });
    patch.flatId = flat.id;
    patch.flatLabel = flat.label;
    patch.towerName = tower.name;
  }

  await db.update(users).set(patch).where(eq(users.id, req.params.id));
  const [updated] = await db.select().from(users).where(eq(users.id, req.params.id));
  const { passwordHash, ...safe } = updated;
  res.json({ user: safe });
});

// ---------- Edit guard details (gate, shift, contact info) ----------
const editGuardSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(10).max(15).optional(),
  gate: z.string().min(1).optional(),
  shift: z.enum(["morning", "evening", "night"]).optional(),
});

router.put("/guards/:id", async (req, res) => {
  const parsed = editGuardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const [existing] = await db.select().from(users).where(and(eq(users.id, req.params.id), eq(users.societyId, req.user!.societyId)));
  if (!existing || existing.role !== "guard") return res.status(404).json({ error: "Guard not found" });

  await db.update(users).set(parsed.data).where(eq(users.id, req.params.id));
  const [updated] = await db.select().from(users).where(eq(users.id, req.params.id));
  const { passwordHash, ...safe } = updated;
  res.json({ user: safe });
});

// ---------- Society settings (name, address, logo) ----------
router.get("/society", async (req, res) => {
  const [society] = await db.select().from(societies).where(eq(societies.id, req.user!.societyId));
  if (!society) return res.status(404).json({ error: "Society not found" });
  res.json({ society });
});

const updateSocietySchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

router.put("/society", async (req, res) => {
  const parsed = updateSocietySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await db.update(societies).set(parsed.data).where(eq(societies.id, req.user!.societyId));
  const [updated] = await db.select().from(societies).where(eq(societies.id, req.user!.societyId));
  res.json({ society: updated });
});

// ---------- Dashboard: the KPI tiles + recent-activity feed for the admin home screen ----------
// Everything here is scoped to the caller's society, either directly (users, notices, complaints
// carry no societyId today so they're global in this single-society-per-deployment demo setup —
// consistent with how every other module already reads them) or transitively through flatLabel.
router.get("/dashboard", async (req, res) => {
  const societyId = req.user!.societyId;
  const people = await db.select().from(users).where(eq(users.societyId, societyId));
  const totalResidents = people.filter((p: any) => p.role === "resident" && p.status !== "disabled").length;
  const totalGuards = people.filter((p: any) => p.role === "guard" && p.status !== "disabled").length;

  const allVisitors = await db.select().from(visitors);
  const todayStr = new Date().toISOString().slice(0, 10);
  const visitorsToday = allVisitors.filter((v: any) => (v.requestedAt ?? "").slice(0, 10) === todayStr).length;
  const visitorsInside = allVisitors.filter((v: any) => v.status === "arrived").length;

  const allComplaints = await db.select().from(complaints);
  const pendingComplaints = allComplaints.filter((c: any) => c.status === "open" || c.status === "assigned" || c.status === "in_progress").length;

  const allBookings = await db.select().from(bookings);
  const todaysBookings = allBookings.filter((b: any) => b.date === todayStr && b.status === "confirmed").length;

  // Recent activity — merge a handful of recent rows from each stream, newest first.
  const recentVisitorEvents = allVisitors
    .filter((v: any) => v.status === "approved" || v.status === "rejected")
    .slice(-5)
    .map((v: any) => ({
      id: `visitor-${v.id}`,
      type: "visitor" as const,
      text: `${v.name} was ${v.status} for ${v.flatLabel}`,
      at: v.requestedAt,
    }));
  const recentComplaintEvents = allComplaints
    .filter((c: any) => c.status === "resolved" || c.status === "closed")
    .slice(-5)
    .map((c: any) => ({ id: `complaint-${c.id}`, type: "complaint" as const, text: `Complaint "${c.title}" ${c.status}`, at: c.updatedAt }));
  const recentInvites = people
    .filter((p: any) => p.status === "pending_invitation")
    .slice(-5)
    .map((p: any) => ({ id: `invite-${p.id}`, type: "invite" as const, text: `${p.name} invited as ${p.role}`, at: p.createdAt }));
  const recentNotices = (await db.select().from(notices))
    .slice(-5)
    .map((n: any) => ({ id: `notice-${n.id}`, type: "notice" as const, text: `Notice published: ${n.title}`, at: n.createdAt }));

  const recentActivity = [...recentVisitorEvents, ...recentComplaintEvents, ...recentInvites, ...recentNotices]
    .sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime())
    .slice(0, 8);

  res.json({
    kpis: { totalResidents, totalGuards, visitorsToday, visitorsInside, pendingComplaints, todaysBookings },
    recentActivity,
  });
});

// ---------- Visitor oversight: today / inside / pending / rejected + search ----------
router.get("/visitors/overview", async (_req, res) => {
  const allVisitors = await db.select().from(visitors);
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = allVisitors.filter((v: any) => (v.requestedAt ?? "").slice(0, 10) === todayStr);
  res.json({
    visitorsToday: today.length,
    visitorsInside: allVisitors.filter((v: any) => v.status === "arrived").length,
    pendingRequests: allVisitors.filter((v: any) => v.status === "pending").length,
    rejectedToday: today.filter((v: any) => v.status === "rejected").length,
  });
});

router.get("/visitors/search", async (req, res) => {
  const { name, phone, vehicle, date } = req.query as { name?: string; phone?: string; vehicle?: string; date?: string };
  let rows = await db.select().from(visitors);
  if (name) rows = rows.filter((v: any) => v.name.toLowerCase().includes(name.toLowerCase()));
  if (phone) rows = rows.filter((v: any) => (v.phone ?? "").includes(phone));
  if (vehicle) rows = rows.filter((v: any) => (v.vehicleNumber ?? "").toLowerCase().includes(vehicle.toLowerCase()));
  if (date) rows = rows.filter((v: any) => (v.requestedAt ?? "").slice(0, 10) === date);
  rows.sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  res.json({ visitors: rows.slice(0, 100) });
});

export default router;