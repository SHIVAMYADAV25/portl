import { v4 as uuid } from "uuid";
import { db } from "../db";
import { users } from "../db/schema";
import { signAccessToken } from "../utils/jwt";

/** Inserts a user directly and returns { user, token } — skips signup/login so route tests can
 *  jump straight to exercising the route under test. */
export async function createTestUser(overrides: {
  role: "resident" | "guard" | "admin";
  name?: string;
  phone?: string;
  flatLabel?: string;
  towerName?: string;
}) {
  const id = uuid();
  const phone = overrides.phone ?? `9${Math.floor(100000000 + Math.random() * 899999999)}`;
  const user = {
    id,
    name: overrides.name ?? "Test User",
    phone,
    role: overrides.role,
    flatLabel: overrides.flatLabel,
    towerName: overrides.towerName,
  };
  await db.insert(users).values(user);

  const token = signAccessToken({ sub: id, role: overrides.role, phone });
  return { user, token };
}
