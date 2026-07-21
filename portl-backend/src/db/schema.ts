// Every module imports tables from here (e.g. `import { users } from "../../db/schema"`) so
// switching database drivers is a one-line env var change, not a find-and-replace across the
// codebase. See db/index.ts for the matching connection switch, and the README for exactly what
// "swap to Postgres" involves in practice (short version: it's already done — just set
// DB_DRIVER=postgres and DATABASE_URL).
import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";

const driver = (process.env.DB_DRIVER || "sqlite").toLowerCase();
const active = driver === "postgres" ? pgSchema : sqliteSchema;

// Loosely typed on purpose: SQLiteTable and PgTable are structurally different at the type
// level even though the query API (select/insert/update/delete/where) is the same at runtime.
// Every module in src/modules only ever uses that shared subset, so this is safe in practice.
export const societies = active.societies as any;
export const towers = active.towers as any;
export const flats = active.flats as any;
export const users = active.users as any;
export const pushTokens = active.pushTokens as any;
export const notifications = active.notifications as any;
export const visitors = active.visitors as any;
export const guestPasses = active.guestPasses as any;
export const complaints = active.complaints as any;
export const amenities = active.amenities as any;
export const bookings = active.bookings as any;
export const notices = active.notices as any;
export const polls = active.polls as any;
export const pollOptions = active.pollOptions as any;
export const votes = active.votes as any;
export const staff = active.staff as any;
export const bills = active.bills as any;
export const payments = active.payments as any;
