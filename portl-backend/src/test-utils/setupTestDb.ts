import { runMigrationsSqlite } from "../db/migrate.sqlite";

/** Bootstraps the schema on the in-memory sqlite DB configured in test-utils/env.ts. */
export function setupTestDb() {
  runMigrationsSqlite();
}
