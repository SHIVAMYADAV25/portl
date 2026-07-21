import { dbDriver } from "./index";

export async function runMigrations() {
  if (dbDriver === "postgres") {
    const { runMigrationsPg } = await import("./migrate.pg");
    await runMigrationsPg();
  } else {
    const { runMigrationsSqlite } = await import("./migrate.sqlite");
    runMigrationsSqlite();
  }
}
