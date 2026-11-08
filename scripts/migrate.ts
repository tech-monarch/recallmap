/**
 * Applies Drizzle migrations to the database in MIGRATION_DATABASE_URL (or DATABASE_URL).
 * Refuses production unless MIGRATE_CONFIRM=yes. Run from a machine or CI job, never at app boot.
 */
import { createDb } from "../src/server/db/client";
import { runMigrations } from "../src/server/db/migrate";

const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set MIGRATION_DATABASE_URL or DATABASE_URL.");
  process.exit(1);
}
if (process.env.APP_ENV === "production" && process.env.MIGRATE_CONFIRM !== "yes") {
  console.error("APP_ENV=production: set MIGRATE_CONFIRM=yes after taking a verified backup.");
  process.exit(1);
}
const handle = createDb({ url, max: 1, applicationName: "recallmap-migrate" });
try {
  await runMigrations(handle.db);
  console.log("Migrations applied.");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : "unknown error");
  process.exitCode = 1;
} finally {
  await handle.close();
}
