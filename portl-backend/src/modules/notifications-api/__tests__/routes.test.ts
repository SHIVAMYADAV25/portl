import request from "supertest";
import { eq } from "drizzle-orm";
import { setupTestDb } from "../../../test-utils/setupTestDb";
import { buildTestApp } from "../../../test-utils/buildTestApp";
import { createTestUser } from "../../../test-utils/createTestUser";
import { db } from "../../../db";
import { notifications } from "../../../db/schema";

beforeAll(() => setupTestDb());

import notificationRoutes from "../routes";
import { notifyUser, notifyAllUsers } from "../../notifications";

const app = buildTestApp("/notifications", notificationRoutes);

describe("notifyUser persists an in-app inbox row", () => {
  it("writes a notification row for the target user", async () => {
    const { user, token } = await createTestUser({ role: "resident", flatLabel: "A-1" });
    await notifyUser(user.id, "Visitor waiting", "Delivery at the gate", "visitor", { visitorId: "v1" });

    const res = await request(app).get("/notifications").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0]).toMatchObject({
      title: "Visitor waiting",
      body: "Delivery at the gate",
      type: "visitor",
      read: false,
      meta: { visitorId: "v1" },
    });
  });

  it("does not fail if the user has no registered push token (push is best-effort, inbox write is not)", async () => {
    const { user } = await createTestUser({ role: "resident", flatLabel: "B-1" });
    await expect(notifyUser(user.id, "Test", "Body")).resolves.toBeUndefined();

    const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id));
    expect(rows).toHaveLength(1);
  });
});

describe("notifyAllUsers persists a row for every user", () => {
  it("writes a notification row reaching every existing user, not just some", async () => {
    const a = await createTestUser({ role: "resident", flatLabel: "C-1" });
    const b = await createTestUser({ role: "guard" });

    await notifyAllUsers("New notice", "Water shutoff tomorrow", "notice", { noticeId: "n1" });

    const resA = await request(app).get("/notifications").set("Authorization", `Bearer ${a.token}`);
    const resB = await request(app).get("/notifications").set("Authorization", `Bearer ${b.token}`);
    expect(resA.body.notifications.some((n: any) => n.title === "New notice")).toBe(true);
    expect(resB.body.notifications.some((n: any) => n.title === "New notice")).toBe(true);
  });
});

describe("GET /notifications — scoping", () => {
  it("only returns the requesting user's own notifications", async () => {
    const a = await createTestUser({ role: "resident", flatLabel: "D-1" });
    const b = await createTestUser({ role: "resident", flatLabel: "D-2" });
    await notifyUser(a.user.id, "For A", "...");
    await notifyUser(b.user.id, "For B", "...");

    const res = await request(app).get("/notifications").set("Authorization", `Bearer ${a.token}`);
    expect(res.body.notifications.some((n: any) => n.title === "For A")).toBe(true);
    expect(res.body.notifications.some((n: any) => n.title === "For B")).toBe(false);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });
});

describe("GET /notifications/unread-count", () => {
  it("counts only unread notifications", async () => {
    const { user, token } = await createTestUser({ role: "resident", flatLabel: "E-1" });
    await notifyUser(user.id, "One", "...");
    await notifyUser(user.id, "Two", "...");

    const res = await request(app).get("/notifications/unread-count").set("Authorization", `Bearer ${token}`);
    expect(res.body.count).toBe(2);
  });
});

describe("POST /notifications/:id/read", () => {
  it("marks a notification as read", async () => {
    const { user, token } = await createTestUser({ role: "resident", flatLabel: "F-1" });
    await notifyUser(user.id, "Mark me", "...");
    const list = await request(app).get("/notifications").set("Authorization", `Bearer ${token}`);
    const id = list.body.notifications[0].id;

    const res = await request(app).post(`/notifications/${id}/read`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const after = await request(app).get("/notifications/unread-count").set("Authorization", `Bearer ${token}`);
    expect(after.body.count).toBe(0);
  });

  it("cannot mark another user's notification as read", async () => {
    const a = await createTestUser({ role: "resident", flatLabel: "G-1" });
    const b = await createTestUser({ role: "resident", flatLabel: "G-2" });
    await notifyUser(a.user.id, "A's notification", "...");
    const list = await request(app).get("/notifications").set("Authorization", `Bearer ${a.token}`);
    const id = list.body.notifications[0].id;

    const res = await request(app).post(`/notifications/${id}/read`).set("Authorization", `Bearer ${b.token}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a notification that doesn't exist", async () => {
    const { token } = await createTestUser({ role: "resident", flatLabel: "H-1" });
    const res = await request(app).post("/notifications/does-not-exist/read").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("POST /notifications/read-all", () => {
  it("marks every one of the user's notifications as read, leaving others' untouched", async () => {
    const a = await createTestUser({ role: "resident", flatLabel: "I-1" });
    const b = await createTestUser({ role: "resident", flatLabel: "I-2" });
    await notifyUser(a.user.id, "A1", "...");
    await notifyUser(a.user.id, "A2", "...");
    await notifyUser(b.user.id, "B1", "...");

    const res = await request(app).post("/notifications/read-all").set("Authorization", `Bearer ${a.token}`);
    expect(res.status).toBe(200);

    const aCount = await request(app).get("/notifications/unread-count").set("Authorization", `Bearer ${a.token}`);
    const bCount = await request(app).get("/notifications/unread-count").set("Authorization", `Bearer ${b.token}`);
    expect(aCount.body.count).toBe(0);
    expect(bCount.body.count).toBe(1);
  });
});
