import crypto from "crypto";
import request from "supertest";
import { setupTestDb } from "../../../test-utils/setupTestDb";
import { buildTestApp } from "../../../test-utils/buildTestApp";
import { createTestUser } from "../../../test-utils/createTestUser";

const ordersCreate = jest.fn();
jest.mock("razorpay", () => jest.fn().mockImplementation(() => ({ orders: { create: ordersCreate } })));

beforeAll(() => setupTestDb());

import billRoutes from "../routes";
const app = buildTestApp("/bills", billRoutes);

async function createBill(adminToken: string, overrides: Partial<{ flatLabel: string; title: string; amount: number; dueDate: string }> = {}) {
  const res = await request(app)
    .post("/bills")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      flatLabel: overrides.flatLabel ?? "A-1005",
      title: overrides.title ?? "May Maintenance",
      amount: overrides.amount ?? 2500,
      dueDate: overrides.dueDate ?? "2026-05-10",
    });
  return res.body.id as string;
}

describe("POST /bills (admin creates a bill)", () => {
  it("creates a bill", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app)
      .post("/bills")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ flatLabel: "A-1005", title: "May Maintenance", amount: 2500, dueDate: "2026-05-10" });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
  });

  it("a resident cannot create a bill (admin-only)", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "A-1005" });
    const res = await request(app)
      .post("/bills")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ flatLabel: "A-1005", title: "x", amount: 100, dueDate: "2026-05-10" });
    expect(res.status).toBe(403);
  });

  it("rejects a non-positive amount", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app)
      .post("/bills")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ flatLabel: "A-1005", title: "x", amount: -50, dueDate: "2026-05-10" });
    expect(res.status).toBe(400);
  });
});

describe("GET /bills (role-scoped)", () => {
  it("a resident only sees bills for their own flat", async () => {
    const admin = await createTestUser({ role: "admin" });
    await createBill(admin.token, { flatLabel: "M-1" });
    await createBill(admin.token, { flatLabel: "N-1" });

    const resident = await createTestUser({ role: "resident", flatLabel: "M-1" });
    const res = await request(app).get("/bills").set("Authorization", `Bearer ${resident.token}`);
    expect(res.status).toBe(200);
    expect(res.body.bills.every((b: any) => b.flatLabel === "M-1")).toBe(true);
  });

  it("an admin sees bills across all flats", async () => {
    const admin = await createTestUser({ role: "admin" });
    await createBill(admin.token, { flatLabel: "P-1" });
    await createBill(admin.token, { flatLabel: "Q-1" });

    const res = await request(app).get("/bills").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    const flats = res.body.bills.map((b: any) => b.flatLabel);
    expect(flats).toEqual(expect.arrayContaining(["P-1", "Q-1"]));
  });
});

describe("POST /bills/:id/pay/mock", () => {
  it("marks a bill as paid without touching Razorpay", async () => {
    const admin = await createTestUser({ role: "admin" });
    const resident = await createTestUser({ role: "resident", flatLabel: "R-1" });
    const billId = await createBill(admin.token, { flatLabel: "R-1" });

    const res = await request(app).post(`/bills/${billId}/pay/mock`).set("Authorization", `Bearer ${resident.token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const list = await request(app).get("/bills").set("Authorization", `Bearer ${resident.token}`);
    expect(list.body.bills.find((b: any) => b.id === billId).status).toBe("paid");
  });
});

describe("Razorpay order + verify flow", () => {
  beforeEach(() => {
    ordersCreate.mockReset();
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
  });

  it("creates a Razorpay order for an unpaid bill", async () => {
    ordersCreate.mockResolvedValueOnce({ id: "order_abc123", amount: 250000, currency: "INR" });

    const admin = await createTestUser({ role: "admin" });
    const resident = await createTestUser({ role: "resident", flatLabel: "S-1" });
    const billId = await createBill(admin.token, { flatLabel: "S-1", amount: 2500 });

    const res = await request(app)
      .post(`/bills/${billId}/pay/order`)
      .set("Authorization", `Bearer ${resident.token}`);

    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe("order_abc123");
    expect(ordersCreate).toHaveBeenCalledWith({ amount: 250000, currency: "INR", receipt: billId });
  });

  it("returns 409 when creating an order for an already-paid bill", async () => {
    const admin = await createTestUser({ role: "admin" });
    const resident = await createTestUser({ role: "resident", flatLabel: "T-1" });
    const billId = await createBill(admin.token, { flatLabel: "T-1" });
    await request(app).post(`/bills/${billId}/pay/mock`).set("Authorization", `Bearer ${resident.token}`);

    const res = await request(app)
      .post(`/bills/${billId}/pay/order`)
      .set("Authorization", `Bearer ${resident.token}`);
    expect(res.status).toBe(409);
  });

  it("verifies a correctly-signed payment and marks the bill paid", async () => {
    ordersCreate.mockResolvedValueOnce({ id: "order_verify_ok", amount: 250000, currency: "INR" });

    const admin = await createTestUser({ role: "admin" });
    const resident = await createTestUser({ role: "resident", flatLabel: "U-1" });
    const billId = await createBill(admin.token, { flatLabel: "U-1" });

    await request(app).post(`/bills/${billId}/pay/order`).set("Authorization", `Bearer ${resident.token}`);

    const razorpay_order_id = "order_verify_ok";
    const razorpay_payment_id = "pay_xyz789";
    const razorpay_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const res = await request(app)
      .post(`/bills/${billId}/pay/verify`)
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const list = await request(app).get("/bills").set("Authorization", `Bearer ${resident.token}`);
    expect(list.body.bills.find((b: any) => b.id === billId).status).toBe("paid");
  });

  it("rejects a payment with a bad/forged signature", async () => {
    const admin = await createTestUser({ role: "admin" });
    const resident = await createTestUser({ role: "resident", flatLabel: "V-1" });
    const billId = await createBill(admin.token, { flatLabel: "V-1" });

    const res = await request(app)
      .post(`/bills/${billId}/pay/verify`)
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ razorpay_order_id: "order_fake", razorpay_payment_id: "pay_fake", razorpay_signature: "not-a-real-signature" });

    expect(res.status).toBe(400);

    const list = await request(app).get("/bills").set("Authorization", `Bearer ${resident.token}`);
    expect(list.body.bills.find((b: any) => b.id === billId).status).toBe("unpaid");
  });
});

describe("POST /bills/mark-paid (admin bulk reconcile)", () => {
  it("marks multiple unpaid bills as paid in one call", async () => {
    const admin = await createTestUser({ role: "admin" });
    const billA = await createBill(admin.token, { flatLabel: "W-1" });
    const billB = await createBill(admin.token, { flatLabel: "W-2" });

    const res = await request(app)
      .post("/bills/mark-paid")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ids: [billA, billB] });

    expect(res.status).toBe(200);
    expect(res.body.updated.sort()).toEqual([billA, billB].sort());

    const list = await request(app).get("/bills").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.bills.find((b: any) => b.id === billA).status).toBe("paid");
    expect(list.body.bills.find((b: any) => b.id === billB).status).toBe("paid");
  });

  it("is idempotent — marking an already-paid bill again still succeeds", async () => {
    const admin = await createTestUser({ role: "admin" });
    const billId = await createBill(admin.token, { flatLabel: "X-9" });

    await request(app).post("/bills/mark-paid").set("Authorization", `Bearer ${admin.token}`).send({ ids: [billId] });
    const second = await request(app)
      .post("/bills/mark-paid")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ids: [billId] });

    expect(second.status).toBe(200);
    expect(second.body.updated).toEqual([billId]);
  });

  it("silently skips ids that don't exist rather than erroring", async () => {
    const admin = await createTestUser({ role: "admin" });
    const billId = await createBill(admin.token, { flatLabel: "Y-9" });

    const res = await request(app)
      .post("/bills/mark-paid")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ids: [billId, "does-not-exist"] });

    expect(res.status).toBe(200);
    expect(res.body.updated).toEqual([billId]);
  });

  it("a resident cannot call the bulk mark-paid endpoint (admin-only)", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "Z-9" });
    const res = await request(app)
      .post("/bills/mark-paid")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ ids: ["whatever"] });
    expect(res.status).toBe(403);
  });

  it("rejects an empty ids array", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app)
      .post("/bills/mark-paid")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });
});
