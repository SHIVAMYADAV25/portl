import request from "supertest";
import { setupTestDb } from "../../../test-utils/setupTestDb";
import { buildTestApp } from "../../../test-utils/buildTestApp";
import { createTestUser } from "../../../test-utils/createTestUser";

jest.mock("../../../socket", () => ({
  socketEvents: { ticketUpdated: jest.fn() },
}));

beforeAll(() => setupTestDb());

import complaintRoutes from "../routes";
const app = buildTestApp("/complaints", complaintRoutes);

describe("POST /complaints", () => {
  it("a resident can raise a complaint, tagged with their own flat", async () => {
    const { token } = await createTestUser({ role: "resident", flatLabel: "A-101" });
    const res = await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Leaking tap", category: "Plumbing", description: "Kitchen tap won't stop dripping" });

    expect(res.status).toBe(201);
    expect(res.body.complaint).toMatchObject({ title: "Leaking tap", status: "open", flatLabel: "A-101" });
  });

  it("a guard cannot raise a complaint (resident-only route)", async () => {
    const { token } = await createTestUser({ role: "guard" });
    const res = await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test", category: "Other" });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid category", async () => {
    const { token } = await createTestUser({ role: "resident", flatLabel: "A-101" });
    const res = await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test", category: "NotARealCategory" });
    expect(res.status).toBe(400);
  });
});

describe("GET /complaints (role-scoped visibility)", () => {
  it("a resident only sees their own complaints", async () => {
    const residentA = await createTestUser({ role: "resident", flatLabel: "A-1" });
    const residentB = await createTestUser({ role: "resident", flatLabel: "B-1" });

    await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${residentA.token}`)
      .send({ title: "A's complaint", category: "Electrical" });
    await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${residentB.token}`)
      .send({ title: "B's complaint", category: "Electrical" });

    const res = await request(app).get("/complaints").set("Authorization", `Bearer ${residentA.token}`);
    expect(res.status).toBe(200);
    expect(res.body.complaints.every((c: any) => c.raisedByUserId === residentA.user.id)).toBe(true);
  });

  it("an admin sees all complaints across residents", async () => {
    const residentA = await createTestUser({ role: "resident", flatLabel: "X-1" });
    const admin = await createTestUser({ role: "admin" });

    await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${residentA.token}`)
      .send({ title: "Visible to admin", category: "Security" });

    const res = await request(app).get("/complaints").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.complaints.some((c: any) => c.title === "Visible to admin")).toBe(true);
  });

  it("filters by status query param", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "Y-1" });
    await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ title: "Open one", category: "Parking" });

    const res = await request(app)
      .get("/complaints")
      .query({ status: "resolved" })
      .set("Authorization", `Bearer ${resident.token}`);
    expect(res.status).toBe(200);
    expect(res.body.complaints.length).toBe(0);
  });
});

describe("PUT /complaints/:id (admin updates status)", () => {
  it("an admin can move a complaint to in_progress and assign it", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "Z-1" });
    const admin = await createTestUser({ role: "admin" });

    const create = await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ title: "Needs assignment", category: "Housekeeping" });
    const id = create.body.complaint.id;

    const update = await request(app)
      .put(`/complaints/${id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "in_progress", assignedTo: "Housekeeping Staff" });

    expect(update.status).toBe(200);
    expect(update.body.complaint.status).toBe("in_progress");
    expect(update.body.complaint.assignedTo).toBe("Housekeeping Staff");
  });

  it("a resident cannot update complaint status (admin-only route)", async () => {
    const resident = await createTestUser({ role: "resident", flatLabel: "Z-2" });
    const create = await request(app)
      .post("/complaints")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ title: "Mine", category: "Other" });

    const update = await request(app)
      .put(`/complaints/${create.body.complaint.id}`)
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ status: "resolved" });
    expect(update.status).toBe(403);
  });

  it("returns 404 for a complaint that doesn't exist", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app)
      .put("/complaints/does-not-exist")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ status: "closed" });
    expect(res.status).toBe(404);
  });
});
