import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { bills, payments, users } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";
import { getRazorpay } from "../../utils/razorpay";

const router = Router();

router.get("/", isAuthenticated, async (req, res) => {
  let rows = await db.select().from(bills);
  if (req.user!.role === "resident") {
    const [me] = await db.select().from(users).where(eq(users.id, req.user!.sub));
    rows = rows.filter((b) => b.flatLabel === me?.flatLabel);
  }
  res.json({ bills: rows });
});

const createBillSchema = z.object({
  flatLabel: z.string(),
  title: z.string(),
  amount: z.number().positive(),
  dueDate: z.string(),
  period: z.string().optional(),
});

router.post("/", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createBillSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const id = uuid();
  await db.insert(bills).values({ id, ...parsed.data, status: "unpaid" });
  res.status(201).json({ id });
});

// ---------- Razorpay: create order ----------
router.post("/:id/pay/order", isAuthenticated, checkRole("resident"), async (req, res) => {
  const [bill] = await db.select().from(bills).where(eq(bills.id, req.params.id));
  if (!bill) return res.status(404).json({ error: "Bill not found" });
  if (bill.status === "paid") return res.status(409).json({ error: "Bill already paid" });

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: bill.amount * 100, // paise
      currency: "INR",
      receipt: bill.id,
    });

    const paymentId = uuid();
    await db.insert(payments).values({
      id: paymentId,
      billId: bill.id,
      flatLabel: bill.flatLabel,
      amountPaid: bill.amount,
      razorpayOrderId: order.id,
      status: "created",
    });

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, paymentId });
  } catch (err) {
    res.status(503).json({ error: (err as Error).message });
  }
});

// ---------- Razorpay: verify payment signature after checkout completes on the client ----------
const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

router.post("/:id/pay/verify", isAuthenticated, checkRole("resident"), async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return res.status(503).json({ error: "Razorpay is not configured" });

  const expected = crypto.createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: "Payment signature verification failed" });
  }

  await db.update(bills).set({ status: "paid" }).where(eq(bills.id, req.params.id));
  await db
    .update(payments)
    .set({ status: "paid", razorpayPaymentId: razorpay_payment_id })
    .where(eq(payments.razorpayOrderId, razorpay_order_id));

  res.json({ ok: true });
});

// Demo/offline helper: mark paid without a real Razorpay flow (useful when no internet/keys in sandbox).
router.post("/:id/pay/mock", isAuthenticated, checkRole("resident"), async (req, res) => {
  await db.update(bills).set({ status: "paid" }).where(eq(bills.id, req.params.id));
  res.json({ ok: true });
});

// ---------- Admin: reconcile offline/cash payments (single or bulk) ----------
// Lets the admin dashboard mark bills as paid outside the Razorpay flow — e.g. cash/cheque
// collected in person, or bulk-clearing a batch of dues. Idempotent on already-paid bills.
const markPaidSchema = z.object({
  ids: z.array(z.string()).min(1),
});

router.post("/mark-paid", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = markPaidSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated: string[] = [];
  for (const id of parsed.data.ids) {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    if (!bill) continue;
    if (bill.status !== "paid") {
      await db.update(bills).set({ status: "paid" }).where(eq(bills.id, id));
    }
    updated.push(id);
  }

  res.json({ ok: true, updated });
});

export default router;
