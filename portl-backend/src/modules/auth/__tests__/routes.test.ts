import request from "supertest";
import { setupTestDb } from "../../../test-utils/setupTestDb";
import { buildTestApp } from "../../../test-utils/buildTestApp";

beforeAll(() => setupTestDb());

// Route module is required after the DB is migrated so its top-level `db` import points at the
// already-bootstrapped in-memory sqlite instance from test-utils/env.ts + setupTestDb().
import authRoutes from "../routes";
const app = buildTestApp("/auth", authRoutes);

describe("POST /auth/signup", () => {
  it("creates a new account and returns tokens", async () => {
    const res = await request(app).post("/auth/signup").send({
      name: "Priya Menon",
      phone: "9000000001",
      password: "demo1234",
      role: "resident",
      flatLabel: "A-1005",
      towerName: "Tower A",
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Priya Menon", phone: "9000000001", role: "resident" });
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
  });

  it("rejects a duplicate phone number", async () => {
    await request(app).post("/auth/signup").send({
      name: "First",
      phone: "9000000002",
      password: "demo1234",
      role: "resident",
    });
    const res = await request(app).post("/auth/signup").send({
      name: "Second",
      phone: "9000000002",
      password: "demo1234",
      role: "resident",
    });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid payload (password too short)", async () => {
    const res = await request(app).post("/auth/signup").send({
      name: "Bad",
      phone: "9000000003",
      password: "abc",
      role: "resident",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeAll(async () => {
    await request(app).post("/auth/signup").send({
      name: "Login Test",
      phone: "9000000010",
      password: "demo1234",
      role: "resident",
    });
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/auth/login").send({ phone: "9000000010", password: "demo1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe("9000000010");
  });

  it("rejects an incorrect password", async () => {
    const res = await request(app).post("/auth/login").send({ phone: "9000000010", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects a phone number that doesn't exist", async () => {
    const res = await request(app).post("/auth/login").send({ phone: "9999999999", password: "demo1234" });
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/request-otp + /auth/verify-otp (demo mode — no Twilio configured)", () => {
  it("request-otp signals demo mode instead of actually sending an SMS", async () => {
    const res = await request(app).post("/auth/request-otp").send({ phone: "9000000020" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: false, demoMode: true });
  });

  it("verify-otp accepts the fixed demo code and auto-provisions a new resident", async () => {
    const res = await request(app).post("/auth/verify-otp").send({ phone: "9000000021", otp: "1234", role: "resident" });
    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe("9000000021");
    expect(res.body.user.role).toBe("resident");
  });

  it("verify-otp rejects any code other than the demo code", async () => {
    const res = await request(app).post("/auth/verify-otp").send({ phone: "9000000022", otp: "0000" });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user with a valid token", async () => {
    const signup = await request(app).post("/auth/signup").send({
      name: "Me Test",
      phone: "9000000030",
      password: "demo1234",
      role: "resident",
    });
    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${signup.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe("9000000030");
    expect(res.body.user.passwordHash).toBeUndefined();
  });
});

describe("Rate limiting on OTP endpoints", () => {
  it("returns 429 after exceeding the OTP request limit", async () => {
    let lastStatus = 0;
    // otpLimiter allows 5 requests per window; the 6th should be rejected.
    for (let i = 0; i < 6; i++) {
      const res = await request(app).post("/auth/request-otp").send({ phone: "9000000099" });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
