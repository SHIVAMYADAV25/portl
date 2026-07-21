import { v4 as uuid } from "uuid";
import { db } from "../db";
import { users, societies } from "../db/schema";
import { signAccessToken } from "../utils/jwt";

let cachedTestSocietyId: string | null = null;
async function ensureTestSociety() {
  if (cachedTestSocietyId) return cachedTestSocietyId;
  const id = uuid();
  await db.insert(societies).values({ id, name: "Test Society" });
  cachedTestSocietyId = id;
  return id;
}

/** Inserts a user directly (creating a shared test society on first use) and returns
 *  { user, token } — skips signup/login/activation entirely so route tests can jump straight to
 *  exercising the route under test. */
export async function createTestUser(overrides: {
  role: "resident" | "guard" | "admin";
  name?: string;
  email?: string;
  phone?: string;
  flatLabel?: string;
  towerName?: string;
  societyId?: string;
}) {
  const societyId = overrides.societyId ?? (await ensureTestSociety());
  const id = uuid();
  const phone = overrides.phone ?? `9${Math.floor(100000000 + Math.random() * 899999999)}`;
  const email = overrides.email ?? `${id}@test.portl.demo`;
  const user = {
    id,
    name: overrides.name ?? "Test User",
    email,
    phone,
    role: overrides.role,
    status: "active" as const,
    societyId,
    flatLabel: overrides.flatLabel,
    towerName: overrides.towerName,
  };
  await db.insert(users).values(user);

  const token = signAccessToken({ sub: id, role: overrides.role, societyId });
  return { user, token };
}