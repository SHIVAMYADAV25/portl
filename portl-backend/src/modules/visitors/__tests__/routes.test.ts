import request from "supertest";
import { setupTestDb } from "../../../test-utils/setupTestDb";
import { buildTestApp } from "../../../test-utils/buildTestApp";
import { createTestUser } from "../../../test-utils/createTestUser";

// The route module emits real-time events via socketEvents (backed by a live Socket.IO server
// that isn't running in these tests) and pushes notifications over the network — both are
// side effects unrelated to the HTTP contract under test, so they're mocked out.
jest.mock("../../../socket", () => ({
  socketEvents: {
    visitorRequest: jest.fn(),
    visitorApproved: jest.fn(),
    visitorRejected: jest.fn(),
    visitorEntered: jest.fn(),
    visitorExited: jest.fn(),
  },
}));
jest.mock("../../notifications", () => ({
  notifyUser: jest.fn().mockResolvedValue(undefined),
}));

beforeAll(() => setupTestDb());

import visitorRoutes from "../routes";
const app = buildTestApp("/visitors", visitorRoutes);

describe("POST /visitors (guard registers a visitor)", () => {
  it("allows a guard to register a visitor", async () => {
    const { token } = await createTestUser({ role: "guard" });
    const res = await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Amazon Delivery", category: "delivery", flatLabel: "A-1005" });

    expect(res.status).toBe(201);
    expect(res.body.visitor).toMatchObject({ name: "Amazon Delivery", status: "pending", flatLabel: "A-1005" });
  });

  it("rejects a resident trying to register a visitor (guard-only route)", async () => {
    const { token } = await createTestUser({ role: "resident", flatLabel: "A-1005" });
    const res = await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Someone", category: "guest", flatLabel: "A-1005" });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid category", async () => {
    const { token } = await createTestUser({ role: "guard" });
    const res = await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Someone", category: "not-a-real-category", flatLabel: "A-1005" });
    expect(res.status).toBe(400);
  });
});

describe("Visitor approval flow", () => {
  it("resident approves a pending visitor", async () => {
    const guard = await createTestUser({ role: "guard" });
    const resident = await createTestUser({ role: "resident", flatLabel: "B-201" });

    const register = await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${guard.token}`)
      .send({ name: "Guest of B-201", category: "guest", flatLabel: "B-201" });
    const visitorId = register.body.visitor.id;

    const approve = await request(app)
      .post(`/visitors/${visitorId}/approve`)
      .set("Authorization", `Bearer ${resident.token}`);
    expect(approve.status).toBe(200);
    expect(approve.body.visitor.status).toBe("approved");
    expect(approve.body.visitor.approvedByUserId).toBe(resident.user.id);
  });

  it("resident rejects a pending visitor", async () => {
    const guard = await createTestUser({ role: "guard" });
    const resident = await createTestUser({ role: "resident", flatLabel: "C-301" });

    const register = await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${guard.token}`)
      .send({ name: "Unwanted", category: "other", flatLabel: "C-301" });
    const visitorId = register.body.visitor.id;

    const reject = await request(app)
      .post(`/visitors/${visitorId}/reject`)
      .set("Authorization", `Bearer ${resident.token}`);
    expect(reject.status).toBe(200);
    expect(reject.body.visitor.status).toBe("rejected");
  });

  it("returns 404 when approving a visitor that doesn't exist", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "D-1" });
    const res = await request(app)
      .post("/visitors/does-not-exist/approve")
      .set("Authorization", `Bearer ${resident.token}`);
    expect(res.status).toBe(404);
  });
});

describe("Guard marks entry / exit", () => {
  it("marks an approved visitor as arrived, then exited", async () => {
    const guard = await createTestUser({ role: "guard" });
    const resident = await createTestUser({ role: "resident", flatLabel: "E-501" });

    const register = await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${guard.token}`)
      .send({ name: "Plumber", category: "service", flatLabel: "E-501" });
    const visitorId = register.body.visitor.id;

    await request(app).post(`/visitors/${visitorId}/approve`).set("Authorization", `Bearer ${resident.token}`);

    const entry = await request(app).post(`/visitors/${visitorId}/entry`).set("Authorization", `Bearer ${guard.token}`);
    expect(entry.status).toBe(200);
    expect(entry.body.visitor.status).toBe("arrived");
    expect(entry.body.visitor.entryTime).toBeTruthy();

    const exit = await request(app).post(`/visitors/${visitorId}/exit`).set("Authorization", `Bearer ${guard.token}`);
    expect(exit.status).toBe(200);
    expect(exit.body.visitor.status).toBe("exited");
    expect(exit.body.visitor.exitTime).toBeTruthy();
  });
});

describe("GET /visitors (role-scoped visibility)", () => {
  it("a resident only sees visitors for their own flat", async () => {
    const guard = await createTestUser({ role: "guard" });
    const residentF = await createTestUser({ role: "resident", flatLabel: "F-100" });
    await createTestUser({ role: "resident", flatLabel: "G-200" });

    await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${guard.token}`)
      .send({ name: "Visitor for F-100", category: "guest", flatLabel: "F-100" });
    await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${guard.token}`)
      .send({ name: "Visitor for G-200", category: "guest", flatLabel: "G-200" });

    const res = await request(app).get("/visitors").set("Authorization", `Bearer ${residentF.token}`);
    expect(res.status).toBe(200);
    expect(res.body.visitors.every((v: any) => v.flatLabel === "F-100")).toBe(true);
    expect(res.body.visitors.some((v: any) => v.flatLabel === "G-200")).toBe(false);
  });

  it("a guard can filter by flatLabel via query param", async () => {
    const guard = await createTestUser({ role: "guard" });
    await request(app)
      .post("/visitors")
      .set("Authorization", `Bearer ${guard.token}`)
      .send({ name: "Filter Test Visitor", category: "cab", flatLabel: "H-900" });

    const res = await request(app)
      .get("/visitors")
      .query({ flatLabel: "H-900" })
      .set("Authorization", `Bearer ${guard.token}`);
    expect(res.status).toBe(200);
    expect(res.body.visitors.every((v: any) => v.flatLabel === "H-900")).toBe(true);
  });
});

describe("Guest pass QR flow", () => {
  it("resident generates a pass, guard scans it and it auto-registers + approves the visitor", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "J-1" });
    const guard = await createTestUser({ role: "guard" });

    const passRes = await request(app)
      .post("/visitors/guest-pass")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ guestName: "Weekend Guest", flatLabel: "J-1", validHours: 4 });
    expect(passRes.status).toBe(201);
    const code = passRes.body.pass.code;

    const scanRes = await request(app).get(`/visitors/guest-pass/${code}`).set("Authorization", `Bearer ${guard.token}`);
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.visitor.status).toBe("approved");
    expect(scanRes.body.visitor.flatLabel).toBe("J-1");
  });

  it("rejects re-scanning an already-used pass", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "K-1" });
    const guard = await createTestUser({ role: "guard" });

    const passRes = await request(app)
      .post("/visitors/guest-pass")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ guestName: "One-time Guest", flatLabel: "K-1" });
    const code = passRes.body.pass.code;

    await request(app).get(`/visitors/guest-pass/${code}`).set("Authorization", `Bearer ${guard.token}`);
    const secondScan = await request(app).get(`/visitors/guest-pass/${code}`).set("Authorization", `Bearer ${guard.token}`);
    expect(secondScan.status).toBe(409);
  });

  it("returns 404 for an unknown pass code", async () => {
    const guard = await createTestUser({ role: "guard" });
    const res = await request(app).get("/visitors/guest-pass/PORTL-NOPE").set("Authorization", `Bearer ${guard.token}`);
    expect(res.status).toBe(404);
  });
});
