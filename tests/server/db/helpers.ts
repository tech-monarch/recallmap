import pg from "pg";
import { createDb, type DbHandle } from "../../../src/server/db/client";
import { runMigrations } from "../../../src/server/db/migrate";

export const TEST_URL = process.env.TEST_DATABASE_URL;
export const hasDb = Boolean(TEST_URL);

/** Drops everything and re-applies migrations. Refuses any database whose name does not contain "test". */
export async function resetAndMigrate(): Promise<DbHandle> {
  const url = TEST_URL!;
  const dbName = new URL(url).pathname.slice(1);
  if (!/test/i.test(dbName)) throw new Error(`Refusing to reset database "${dbName}": the name must contain "test".`);
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  try {
    for (const schema of ["pgboss", "pgboss_test", "drizzle"]) await admin.query(`drop schema if exists ${schema} cascade`);
    await admin.query("drop schema if exists public cascade");
    await admin.query("create schema public");
  } finally {
    await admin.end();
  }
  const handle = createDb({ url, max: 3, applicationName: "recallmap-test" });
  await runMigrations(handle.db);
  return handle;
}

export function ctx(userId: string) {
  return { requestId: "req_test0001", userId } as const;
}
