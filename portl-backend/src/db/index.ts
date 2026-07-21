import path from "path";

const DRIVER = (process.env.DB_DRIVER || "sqlite").toLowerCase();

// `db` is loosely typed (see schema.ts for why) so the same query modules work unchanged against
// either BetterSQLite3Database or NodePgDatabase.
export let db: any;
/** Only set when DRIVER === "sqlite" — needed by migrate.ts to run raw bootstrap SQL. */
export let sqlite: any;
/** Only set when DRIVER === "postgres" — needed by migrate.ts to run raw bootstrap SQL. */
export let pgPool: any;

if (DRIVER === "postgres") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { drizzle } = require("drizzle-orm/node-postgres");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DB_DRIVER=postgres requires DATABASE_URL to be set (e.g. postgres://user:pass@localhost:5432/portl)");
  }
  pgPool = new Pool({ connectionString });
  db = drizzle(pgPool);
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { drizzle } = require("drizzle-orm/better-sqlite3");

  const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "../../portl.db");
  sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite);
}

export const dbDriver = DRIVER as "sqlite" | "postgres";
