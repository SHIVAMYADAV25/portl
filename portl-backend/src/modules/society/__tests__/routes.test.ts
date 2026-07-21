import request from "supertest";
import { setupTestDb } from "../../../test-utils/setupTestDb";
import { buildTestApp } from "../../../test-utils/buildTestApp";
import { createTestUser } from "../../../test-utils/createTestUser";

beforeAll(() => setupTestDb());

import societyRoutes from "../routes";
const app = buildTestApp("/", societyRoutes);

async function createTower(adminToken: string, name = "Tower A") {
  const res = await request(app).post("/towers").set("Authorization", `Bearer ${adminToken}`).send({ name });
  return res.body.id as string;
}

describe("POST /towers (admin creates a tower)", () => {
  it("creates a tower", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app).post("/towers").set("Authorization", `Bearer ${admin.token}`).send({ name: "Tower B" });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
  });

  it("a resident cannot create a tower (admin-only)", async () => {
    const resident = await createTestUser({ role: "resident" });
    const res = await request(app).post("/towers").set("Authorization", `Bearer ${resident.token}`).send({ name: "Tower C" });
    expect(res.status).toBe(403);
  });

  it("rejects an empty name", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app).post("/towers").set("Authorization", `Bearer ${admin.token}`).send({ name: "" });
    expect(res.status).toBe(400);
  });
});

describe("GET /towers", () => {
  it("any authenticated role can list towers, not just admin", async () => {
    const admin = await createTestUser({ role: "admin" });
    await createTower(admin.token, "Tower D");
    const guard = await createTestUser({ role: "guard" });
    const res = await request(app).get("/towers").set("Authorization", `Bearer ${guard.token}`);
    expect(res.status).toBe(200);
    expect(res.body.towers.some((t: any) => t.name === "Tower D")).toBe(true);
  });
});

describe("PUT /towers/:id", () => {
  it("admin renames a tower", async () => {
    const admin = await createTestUser({ role: "admin" });
    const id = await createTower(admin.token, "Old Name");
    const res = await request(app).put(`/towers/${id}`).set("Authorization", `Bearer ${admin.token}`).send({ name: "New Name" });
    expect(res.status).toBe(200);
    const list = await request(app).get("/towers").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.towers.find((t: any) => t.id === id).name).toBe("New Name");
  });

  it("404s for a tower that doesn't exist", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app).put("/towers/does-not-exist").set("Authorization", `Bearer ${admin.token}`).send({ name: "X" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /towers/:id", () => {
  it("deletes an empty tower", async () => {
    const admin = await createTestUser({ role: "admin" });
    const id = await createTower(admin.token, "Empty Tower");
    const res = await request(app).delete(`/towers/${id}`).set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
  });

  it("refuses to delete a tower that still has flats (409)", async () => {
    const admin = await createTestUser({ role: "admin" });
    const towerId = await createTower(admin.token, "Occupied Tower");
    await request(app)
      .post("/flats")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ towerId, number: "101", label: "OT-101" });

    const res = await request(app).delete(`/towers/${towerId}`).set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(409);
  });
});

describe("POST /flats (admin creates a flat)", () => {
  it("creates a flat under an existing tower", async () => {
    const admin = await createTestUser({ role: "admin" });
    const towerId = await createTower(admin.token, "Tower E");
    const res = await request(app)
      .post("/flats")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ towerId, number: "202", label: "E-202", ownerName: "Test Owner" });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
  });

  it("rejects a towerId that doesn't match an existing tower", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app)
      .post("/flats")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ towerId: "not-a-real-tower", number: "1", label: "X-1" });
    expect(res.status).toBe(400);
  });

  it("a resident cannot create a flat (admin-only)", async () => {
    const admin = await createTestUser({ role: "admin" });
    const towerId = await createTower(admin.token, "Tower F");
    const resident = await createTestUser({ role: "resident" });
    const res = await request(app)
      .post("/flats")
      .set("Authorization", `Bearer ${resident.token}`)
      .send({ towerId, number: "1", label: "F-1" });
    expect(res.status).toBe(403);
  });
});

describe("GET /flats", () => {
  it("lists all flats", async () => {
    const admin = await createTestUser({ role: "admin" });
    const towerId = await createTower(admin.token, "Tower G");
    await request(app).post("/flats").set("Authorization", `Bearer ${admin.token}`).send({ towerId, number: "1", label: "G-1" });

    const res = await request(app).get("/flats").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.flats.some((f: any) => f.label === "G-1")).toBe(true);
  });

  it("filters by ?towerId=", async () => {
    const admin = await createTestUser({ role: "admin" });
    const towerH = await createTower(admin.token, "Tower H");
    const towerI = await createTower(admin.token, "Tower I");
    await request(app).post("/flats").set("Authorization", `Bearer ${admin.token}`).send({ towerId: towerH, number: "1", label: "H-1" });
    await request(app).post("/flats").set("Authorization", `Bearer ${admin.token}`).send({ towerId: towerI, number: "1", label: "I-1" });

    const res = await request(app).get("/flats").query({ towerId: towerH }).set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.flats.every((f: any) => f.towerId === towerH)).toBe(true);
  });
});

describe("PUT /flats/:id", () => {
  it("updates a flat's owner name", async () => {
    const admin = await createTestUser({ role: "admin" });
    const towerId = await createTower(admin.token, "Tower J");
    const create = await request(app)
      .post("/flats")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ towerId, number: "1", label: "J-1" });

    const res = await request(app)
      .put(`/flats/${create.body.id}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ownerName: "New Owner" });
    expect(res.status).toBe(200);

    const list = await request(app).get("/flats").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.flats.find((f: any) => f.id === create.body.id).ownerName).toBe("New Owner");
  });

  it("404s for a flat that doesn't exist", async () => {
    const admin = await createTestUser({ role: "admin" });
    const res = await request(app)
      .put("/flats/does-not-exist")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ ownerName: "X" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /flats/:id", () => {
  it("deletes a flat", async () => {
    const admin = await createTestUser({ role: "admin" });
    const towerId = await createTower(admin.token, "Tower K");
    const create = await request(app)
      .post("/flats")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ towerId, number: "1", label: "K-1" });

    const res = await request(app).delete(`/flats/${create.body.id}`).set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);

    const list = await request(app).get("/flats").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.flats.find((f: any) => f.id === create.body.id)).toBeUndefined();
  });
});
