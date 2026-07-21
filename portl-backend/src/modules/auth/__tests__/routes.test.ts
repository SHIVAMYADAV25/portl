import request from "supertest";
import { setupTestDb } from "../../../test-utils/setupTestDb";
import { buildTestApp } from "../../../test-utils/buildTestApp";

beforeAll(() => setupTestDb());

import authRoutes from "../routes";
const app = buildTestApp("/auth", authRoutes);

describe("POST /auth/society/bootstrap", () => {
  it("creates a society + an active admin and returns tokens", async () => {
    const res = await request(app).post("/auth/society/bootstrap").send({
      societyName: "Cedar Heights",
      adminName: "Mrs. Sharma",
      adminEmail: "admin@cedar.test",
      adminPhone: "9000000001",
      password: "demo1234",
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Mrs. Sharma", email: "admin@cedar.test", role: "admin", status: "active" });
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
  });

  it("rejects a duplicate admin email", async () => {
    await request(app).post("/auth/society/bootstrap").send({
      societyName: "Dup Society", adminName: "A", adminEmail: "dup@cedar.test", adminPhone: "9000000002", password: "demo1234",
    });
    const res = await request(app).post("/auth/society/bootstrap").send({
      societyName: "Dup Society 2", adminName: "B", adminEmail: "dup@cedar.test", adminPhone: "9000000003", password: "demo1234",
    });
    expect(res.status).toBe(409);
  });
});

describe("POST /auth/login", () => {
  const email = "login-test@cedar.test";

  beforeAll(async () => {
    await request(app).post("/auth/society/bootstrap").send({
      societyName: "Login Test Society", adminName: "Login Test", adminEmail: email, adminPhone: "9000000010", password: "demo1234",
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/auth/login").send({ email, password: "demo1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it("rejects an incorrect password", async () => {
    const res = await request(app).post("/auth/login").send({ email, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects an email that doesn't exist", async () => {
    const res = await request(app).post("/auth/login").send({ email: "nobody@cedar.test", password: "demo1234" });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user with a valid token", async () => {
    const boot = await request(app).post("/auth/society/bootstrap").send({
      societyName: "Me Test Society", adminName: "Me Test", adminEmail: "me@cedar.test", adminPhone: "9000000030", password: "demo1234",
    });
    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${boot.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@cedar.test");
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});

describe("Invitation preview + activation", () => {
  it("returns 410 for a token that doesn't exist", async () => {
    const res = await request(app).get("/auth/invitations/not-a-real-token");
    expect(res.status).toBe(410);
  });
});

describe("Rate limiting on society bootstrap", () => {
  it("returns 429 after exceeding the bootstrap limit", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post("/auth/society/bootstrap").send({
        societyName: `Rate Test ${i}`, adminName: "X", adminEmail: `rate${i}@cedar.test`, adminPhone: "9000000099", password: "demo1234",
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});