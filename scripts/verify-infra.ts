/**
 * Infrastructure acceptance test for a real PostgreSQL service (for example the Aiven free plan).
 * Run it yourself after creating the database; it prints results only (never the connection string or password).
 *
 *   DATABASE_URL=postgres://... npm run verify:infra                       checks 1-8 (read-mostly, creates and drops probe objects)
 *   DATABASE_URL=postgres://... npm run verify:infra -- --migrate          also applies the Drizzle migrations to THIS database
 *   DATABASE_URL=postgres://... npm run verify:infra -- --skip-connection-probe
 *   DATABASE_URL=postgres://... npm run verify:infra -- --watch-reconnect  prints outage/recovery times while you restart the service
 *
 * Use the ADMIN connection for the extension check (an application role may not be allowed to create extensions).
 */
import pg from "pg";
import { PgBoss } from "pg-boss";
import { createDb } from "../src/server/db/client";
import { runMigrations } from "../src/server/db/migrate";

type Status = "PASS" | "FAIL" | "SKIP" | "INFO";
const results: Array<{ check: string; status: Status; detail: string }> = [];
const record = (check: string, status: Status, detail: string) => {
  results.push({ check, status, detail });
  console.log(`${status.padEnd(4)}  ${check}: ${detail}`);
};
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/postgres(ql)?:\/\/[^\s]+/gi, "postgres://[redacted]");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (admin connection string for the service).");
  process.exit(2);
}
const args = new Set(process.argv.slice(2));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function watchReconnect() {
  console.log("Watching the connection every 2 seconds. Restart or power-cycle the service now. Ctrl-C to stop.\n");
  let state: "up" | "down" | "unknown" = "unknown";
  let downSince = 0;
  const pool = new pg.Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 4000 });
  pool.on("error", () => undefined);
  for (;;) {
    const t0 = Date.now();
    try {
      await pool.query("select 1");
      if (state === "down") console.log(`${new Date().toISOString()}  RECONNECTED after ${((Date.now() - downSince) / 1000).toFixed(1)} s outage (same pool object, no restart of this script)`);
      else if (state === "unknown") console.log(`${new Date().toISOString()}  connected`);
      state = "up";
    } catch (e) {
      if (state !== "down") {
        downSince = t0;
        console.log(`${new Date().toISOString()}  DOWN: ${msg(e).slice(0, 120)}`);
      }
      state = "down";
    }
    await sleep(2000);
  }
}

async function main() {
  if (args.has("--watch-reconnect")) return watchReconnect();
  const admin = new pg.Client({ connectionString: url });
  try {
    await admin.connect();
  } catch (e) {
    record("1. connect", "FAIL", msg(e));
    return finish();
  }
  const one = async <T = Record<string, unknown>>(sql: string) => (await admin.query(sql)).rows[0] as T;

  // 1. version
  const v = await one<{ v: string; n: string }>("select version() as v, current_setting('server_version_num') as n");
  const major = Math.floor(Number(v.n) / 10000);
  record("1. PostgreSQL version", major >= 14 ? "PASS" : "FAIL", `${v.v.split(" on ")[0]} (pgvector on Aiven is listed for 14-17; 18 unverified)`);

  // 2. limits
  const lim = await one<{ mc: string; rc: string; su: boolean; me: string }>(
    "select current_setting('max_connections') mc, current_setting('superuser_reserved_connections') rc, (select rolsuper from pg_roles where rolname=current_user) su, current_user me",
  );
  record("2. connection limit", "INFO", `max_connections=${lim.mc}, superuser_reserved_connections=${lim.rc}, so about ${Number(lim.mc) - Number(lim.rc)} usable; connected as a ${lim.su ? "superuser" : "non-superuser"} role`);
  const dbSize = await one<{ s: string }>("select pg_size_pretty(pg_database_size(current_database())) s");
  record("2b. database size now", "INFO", dbSize.s);

  // 3. extensions
  const avail = (await admin.query("select name, default_version from pg_available_extensions where name in ('vector','pgcrypto')")).rows;
  record("3a. extensions offered", avail.length === 2 ? "PASS" : "FAIL", avail.map((r) => `${r.name} ${r.default_version}`).join(", ") || "none offered");
  for (const ext of ["vector", "pgcrypto"]) {
    try {
      await admin.query(`create extension if not exists ${ext}`);
      const r = await one<{ extversion: string }>(`select extversion from pg_extension where extname='${ext}'`);
      record(`3b. CREATE EXTENSION ${ext}`, "PASS", `installed version ${r.extversion}`);
    } catch (e) {
      record(`3b. CREATE EXTENSION ${ext}`, "FAIL", msg(e));
    }
  }

  // 4. vector sanity
  try {
    await admin.query("create temp table _probe (id int, v vector(3))");
    await admin.query("insert into _probe values (1,'[1,0,0]'),(2,'[0,1,0]'),(3,'[0.9,0.1,0]')");
    const r = await one<{ id: number }>("select id from _probe order by v <=> '[1,0,0]' limit 1 offset 1");
    record("4. pgvector query", r.id === 3 ? "PASS" : "FAIL", "cosine nearest-neighbour ordering works on a temp table");
    await admin.query("drop table _probe");
  } catch (e) {
    record("4. pgvector query", "FAIL", msg(e));
  }

  // 5. schema creation privilege (pg-boss needs it)
  try {
    await admin.query("create schema if not exists recallmap_probe");
    await admin.query("drop schema recallmap_probe");
    record("5. create/drop schema", "PASS", "allowed");
  } catch (e) {
    record("5. create/drop schema", "FAIL", msg(e));
  }

  // 6. Drizzle migrations (only with --migrate: they change this database)
  if (args.has("--migrate")) {
    const h = createDb({ url: url!, max: 1, applicationName: "recallmap-verify" });
    try {
      await runMigrations(h.db);
      const t = await one<{ n: string }>("select count(*) n from information_schema.tables where table_schema='public' and table_name in ('users','sessions','app_preferences','learning_preferences','auth_identities','oauth_states','worker_heartbeats')");
      record("6. Drizzle migrations", Number(t.n) === 7 ? "PASS" : "FAIL", `applied; ${t.n}/7 identity tables present`);
    } catch (e) {
      record("6. Drizzle migrations", "FAIL", msg(e));
    } finally {
      await h.close();
    }
  } else record("6. Drizzle migrations", "SKIP", "re-run with --migrate to apply them to this database");

  // 7. pg-boss in a probe schema
  const boss = new PgBoss({ connectionString: url!, max: 2, schema: "pgboss_probe", application_name: "recallmap-verify-boss" });
  boss.on("error", () => undefined);
  try {
    await boss.start();
    await boss.createQueue("probe");
    let handled = false;
    await boss.work("probe", { pollingIntervalSeconds: 0.5 }, async () => void (handled = true));
    const id = await boss.send("probe", { n: 1 });
    for (let i = 0; i < 40 && !handled; i++) await sleep(250);
    let job = id ? await boss.getJobById("probe", id) : null;
    for (let i = 0; i < 12 && handled && job?.state !== "completed"; i++) {
      await sleep(250);
      job = id ? await boss.getJobById("probe", id) : null;
    }
    record("7. pg-boss schema + job round trip", handled ? "PASS" : "FAIL", handled ? `schema created, job ${job?.state ?? "processed"} (retries, dead-letter and drain are covered by the automated tests)` : "job was not processed within 10 s");
  } catch (e) {
    record("7. pg-boss schema + job round trip", "FAIL", msg(e));
  } finally {
    await boss.stop({ graceful: true, timeout: 3000 }).catch(() => undefined);
    await admin.query("drop schema if exists pgboss_probe cascade").catch(() => undefined);
  }

  // 8. observed connection cap
  if (args.has("--skip-connection-probe")) record("8. observed connection cap", "SKIP", "skipped");
  else {
    const held: pg.Client[] = [];
    let err = "";
    const limit = Number(lim.mc) + 5;
    for (let i = 0; i < limit; i++) {
      const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
      c.on("error", () => undefined);
      try {
        await c.connect();
        held.push(c);
      } catch (e) {
        err = msg(e);
        break;
      }
    }
    for (const c of held) await c.end().catch(() => undefined);
    record("8. observed connection cap", "INFO", `${held.length} extra connections opened (plus this script's own) before: ${err || "no failure"}`);
  }
  await admin.end().catch(() => undefined);
  finish();
}

function finish() {
  const failed = results.filter((r) => r.status === "FAIL");
  console.log(`\nSummary: ${results.filter((r) => r.status === "PASS").length} passed, ${failed.length} failed, ${results.filter((r) => r.status === "SKIP").length} skipped.`);
  console.log("Remember: restart and reconnection behaviour is measured with --watch-reconnect while you restart the service from the console.");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("verify-infra crashed:", msg(e));
  process.exit(2);
});
