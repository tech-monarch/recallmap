# RecallMap: Infrastructure Compatibility Spike (simulation)

**This is a SIMULATION on a local PostgreSQL configured like the Aiven free plan. It is not a test of Aiven, Render or R2.** It answers: can Drizzle ORM, a pgvector schema and pg-boss work reliably within a 20-connection, non-superuser, no-pooler setup? The real service must still pass the Aiven acceptance test in `docs/deployment/SETUP_GUIDE.md` section 7.3.

Date: 2026-11-05. Throwaway directory outside the repository; no repository files were changed by the spike.

## Environment

| Item | Value |
|---|---|
| PostgreSQL | 16.15 (Ubuntu package), single node, `max_connections=20`, `shared_buffers=128MB`, default `superuser_reserved_connections=3` |
| pgvector | 0.6.0 (Ubuntu package; **Aiven lists 0.8.1**, so features added in 0.8 such as iterative index scans were not exercised) |
| Roles | `appadmin`: LOGIN, CREATEDB, **not superuser**, owner of the database. Extensions were created by the superuser, as a managed service would do |
| Node / packages | Node 22.23.4, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23.1, pg-boss 12.38.1, zod 4.6.7, tsx |

## Results

| # | Check | Result | Status |
|---|---|---|---|
| 1 | `drizzle-kit generate` from a schema with `vector(768)` and a btree index | generated `CREATE TABLE ... "embedding" vector(768)` and the index | Passed |
| 2 | `drizzle-kit migrate` as the non-superuser owner | applied | Passed |
| 3 | Insert 5,000 chunks (768 dims, about 1.5 KB text) through Drizzle in batches | 2.6 s | Passed |
| 4 | Exact cosine top-8 via Drizzle `cosineDistance`, filtered by user and subject | 29 ms, 8 rows | Passed |
| 5 | HNSW index (`vector_cosine_ops`) then the same query | 7 ms; `EXPLAIN` shows an index scan on the HNSW index | Passed |
| 6 | Storage per chunk (table + HNSW index + text) | about **6,260 bytes** | Measured |
| 7 | pg-boss `start()` as a non-superuser owner with `max: 3` | schema and tables created | Passed |
| 8 | Retry: job fails once then succeeds (`retryLimit` 2, `retryDelay` 1) | 2 attempts, completed | Passed |
| 9 | Dead letter: always-failing job (`retryLimit` 1) | 2 attempts, delivered to the dead-letter queue | Passed |
| 10 | Stuck handler honouring `job.signal` with `expireInSeconds` 3 | signal aborted at expiry, job retried and completed | Passed |
| 11 | Deduplication with `singletonKey` on a **standard** queue | both sends accepted (**no deduplication**) | Observed (design must not rely on it) |
| 12 | Deduplication with `singletonKey` on an `exclusive` queue | second send returned `null` | Passed |
| 13 | Graceful `stop({ graceful: true })` with a job in flight | the in-flight job completed before exit | Passed |
| 14 | Connection use | pg-boss stayed within its `max: 3`; app pool lazily opened connections | Passed |
| 15 | Opening clients until the cap | the 17th connection failed: *remaining connection slots are reserved for roles with the SUPERUSER attribute* (4 existing + 16 opened = 20) | Observed: **usable connections are about 17, not 20** |
| 16 | `vector` extension created by the non-superuser | **not allowed** (`vector` is not a trusted extension; `pgcrypto` is) | Observed: acceptance test must confirm Aiven's admin user can enable it |

### Correction found later (B1a)
The spike script passed `wait: true` to `stop()`. pg-boss v12's `StopOptions` has only `close`, `graceful` and `timeout`; `wait` was ignored (TypeScript flagged it when the real code was written). The observed result (the in-flight job finished before exit) came from `graceful: true` itself. The scripts below still contain the extra option, kept as run.

### Corrections during the spike
The first pg-boss run produced misleading numbers: a deliberately stuck job occupied the single worker slot and starved every later job (retries never ran, the dead-letter queue stayed empty). That is itself a design finding: **one stuck handler blocks a single-worker queue**, so handlers must honour `job.signal`, use per-job timeouts, and the worker should run at least two concurrent consumers. The rerun above uses two workers and a signal-aware handler. The pg-boss v12 API also differs from older documentation: `PgBoss` is a **named** export.

### What the simulation does not prove
Aiven's real reserved-connection count and PostgreSQL build, pgvector 0.8.1 behaviour, behaviour when the free service is powered off and restarted, latency from Render to Aiven, Render's free-instance memory (large documents and OCR), and R2. Those remain Unverified.

## Reproduce
In an empty directory: `npm init -y && npm pkg set type=module`, install `drizzle-orm pg pg-boss zod` and dev `drizzle-kit tsx typescript @types/pg`, start a PostgreSQL with `max_connections=20`, create a non-superuser owner role and database, create the `vector` and `pgcrypto` extensions as superuser, set `DATABASE_URL`, then run the files below (`npx drizzle-kit generate && npx drizzle-kit migrate`, `npx tsx spike.mts`, `npx tsx boss.mts`).

### schema.mts
```ts
import { pgTable, uuid, text, integer, vector, index, timestamp } from "drizzle-orm/pg-core";
export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  subjectId: uuid("subject_id").notNull(),
  text: text("text").notNull(),
  tokenCount: integer("token_count").notNull(),
  embedding: vector("embedding", { dimensions: 768 }),
  embeddingModel: text("embedding_model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("chunks_subject_idx").on(t.userId, t.subjectId)]);
```

### drizzle.config.ts
```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({ dialect: "postgresql", schema: "./schema.ts", out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! } });
```

### spike.mts
```ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { cosineDistance, desc, sql, and, eq } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import { chunks } from "./schema.mts";

const url = process.env.DATABASE_URL!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (n: number) => Array.from({ length: n }, () => Math.random() * 2 - 1);
const out = (k: string, v: unknown) => console.log(k.padEnd(46), typeof v === "string" ? v : JSON.stringify(v));

// ---- 1. app pool (max 5) + drizzle + pgvector
const pool = new pg.Pool({ connectionString: url, max: 5, application_name: "app" });
const db = drizzle(pool);
const user = crypto.randomUUID(), subject = crypto.randomUUID();
await pool.query("truncate chunks");
const N = 5000;
let t = Date.now();
for (let i = 0; i < N; i += 500) {
  await db.insert(chunks).values(Array.from({ length: 500 }, (_, j) => ({
    userId: user, subjectId: subject, text: "synthetic chunk " + (i + j) + " ".repeat(1500), tokenCount: 300,
    embedding: rand(768), embeddingModel: "synthetic-768",
  })));
}
out("insert 5000 x 768-dim chunks (ms)", Date.now() - t);
const q = rand(768);
const search = () => db.select({ id: chunks.id, d: sql<number>`${cosineDistance(chunks.embedding, q)}` }).from(chunks)
  .where(and(eq(chunks.userId, user), eq(chunks.subjectId, subject))).orderBy(cosineDistance(chunks.embedding, q)).limit(8);
t = Date.now(); const r1 = await search(); out("exact cosine top-8 via drizzle (ms)", Date.now() - t); out("rows returned", r1.length);
const size = (await pool.query("select pg_total_relation_size('chunks') as s")).rows[0].s;
out("table+index bytes per chunk (incl. text)", Math.round(Number(size) / N));
await pool.query("create index if not exists chunks_hnsw on chunks using hnsw (embedding vector_cosine_ops)");
t = Date.now(); await search(); out("HNSW cosine top-8 (ms)", Date.now() - t);
const plan = (await pool.query("explain select id from chunks where user_id=$1 and subject_id=$2 order by embedding <=> $3::vector limit 8", [user, subject, JSON.stringify(q)])).rows.map((r: any) => r["QUERY PLAN"]).slice(0, 3);
out("plan (first lines)", plan);
out("pgvector version", (await pool.query("select extversion from pg_extension where extname='vector'")).rows[0].extversion);

// ---- 2. pg-boss (max 3 connections), non-superuser owner
const boss = new PgBoss({ connectionString: url, max: 3, schema: "pgboss", application_name: "pgboss", monitorIntervalSeconds: 2 } as any);
boss.on("error", (e: Error) => out("pgboss error event", e.message));
await boss.start();
out("pg-boss started (schema created as non-superuser)", "yes");
await boss.createQueue("doc.dead");
await boss.createQueue("doc.process", { retryLimit: 2, retryDelay: 1, deadLetter: "doc.dead", expireInSeconds: 3 } as any);
const attempts: Record<string, number> = {};
const done: string[] = [];
await boss.work("doc.process", { batchSize: 1, pollingIntervalSeconds: 0.5 } as any, async (jobs: any[]) => {
  for (const job of jobs) {
    const k = job.data.name; attempts[k] = (attempts[k] ?? 0) + 1;
    if (k === "flaky" && attempts[k] < 2) throw new Error("transient failure");
    if (k === "poison") throw new Error("always fails");
    if (k === "hang" && attempts[k] < 2) { await sleep(60000); }   // simulates a stuck/crashed worker
    if (k === "slow") { await sleep(1500); }
    done.push(k);
  }
});
const ids: Record<string, unknown> = {};
for (const name of ["ok", "flaky", "poison", "hang"]) ids[name] = await boss.send("doc.process", { name }, { retryLimit: name === "poison" ? 1 : 2, retryDelay: 1 } as any);
const dup1 = await boss.send("doc.process", { name: "dedupe" }, { singletonKey: "material-1" } as any);
const dup2 = await boss.send("doc.process", { name: "dedupe" }, { singletonKey: "material-1" } as any);
out("singletonKey: first send id / second send", [!!dup1, dup2]);
await sleep(9000);
out("attempts per job", attempts);
out("completed jobs", done);
const dead: any[] = await (boss as any).fetch("doc.dead", { batchSize: 10 });
out("dead-letter queue received", dead.map((j) => j.data.name));

// ---- 3. connection accounting
const conns = (await pool.query("select coalesce(application_name,'') as app, usename, count(*)::int n from pg_stat_activity where datname='spikedb' group by 1,2 order by 1")).rows;
out("connections in use (by app)", conns);
out("total connections cluster-wide", (await pool.query("select count(*)::int n from pg_stat_activity where backend_type='client backend'")).rows[0].n);

// ---- 4. graceful shutdown with an in-flight job
await boss.send("doc.process", { name: "slow" });
await sleep(1200);
const before = done.length;
await (boss as any).stop({ graceful: true, wait: true, timeout: 8000 });
out("graceful stop: in-flight 'slow' job finished", done.includes("slow") && done.length > before);

// ---- 5. over-subscription: what happens at the 20-connection cap
const extra: pg.Client[] = []; let firstError = "";
for (let i = 0; i < 25; i++) { const c = new pg.Client({ connectionString: url }); try { await c.connect(); extra.push(c); } catch (e: any) { firstError = e.message; break; } }
out("clients opened before failure", extra.length);
out("error at cap", firstError);
for (const c of extra) await c.end();
await pool.end();
process.exit(0);
```

### boss.mts
```ts
import pg from "pg";
import { PgBoss } from "pg-boss";
const url = process.env.DATABASE_URL!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const out = (k: string, v: unknown) => console.log(k.padEnd(52), typeof v === "string" ? v : JSON.stringify(v));
const pool = new pg.Pool({ connectionString: url, max: 2 });
await pool.query("drop schema if exists pgboss cascade");
const boss = new PgBoss({ connectionString: url, max: 3, schema: "pgboss", monitorIntervalSeconds: 2 } as any);
boss.on("error", (e: Error) => out("pgboss error event", e.message));
await boss.start();
await boss.createQueue("doc.dead");
await boss.createQueue("doc.process", { retryLimit: 2, retryDelay: 1, deadLetter: "doc.dead", expireInSeconds: 3 } as any);
await boss.createQueue("doc.unique", { policy: "exclusive" } as any);
const attempts: Record<string, number> = {}; const done: string[] = []; const aborted: string[] = [];
const handler = async (jobs: any[]) => {
  for (const job of jobs) {
    const k = job.data.name; attempts[k] = (attempts[k] ?? 0) + 1;
    if (k === "flaky" && attempts[k] < 2) throw new Error("transient failure");
    if (k === "poison") throw new Error("always fails");
    if (k === "hang" && attempts[k] < 2) {            // stuck handler that honours the abort signal
      await new Promise<void>((res) => job.signal.addEventListener("abort", () => { aborted.push(k); res(); }, { once: true }));
      throw new Error("aborted by expiry");
    }
    if (k === "slow") await sleep(1500);
    done.push(k);
  }
};
await boss.work("doc.process", { batchSize: 1, pollingIntervalSeconds: 0.5 } as any, handler);
await boss.work("doc.process", { batchSize: 1, pollingIntervalSeconds: 0.5 } as any, handler);   // 2 workers => no head-of-line blocking
for (const name of ["ok", "flaky", "poison", "hang"]) await boss.send("doc.process", { name }, { retryLimit: name === "poison" ? 1 : 2, retryDelay: 1 } as any);
const std1 = await boss.send("doc.process", { name: "dupe-std" }, { singletonKey: "m1" } as any);
const std2 = await boss.send("doc.process", { name: "dupe-std2" }, { singletonKey: "m1" } as any);
out("standard queue + singletonKey: both accepted?", [!!std1, !!std2]);
const ex1 = await boss.send("doc.unique", { name: "x" }, { singletonKey: "m1" } as any);
const ex2 = await boss.send("doc.unique", { name: "x" }, { singletonKey: "m1" } as any);
out("exclusive queue + singletonKey: 2nd send is null?", [!!ex1, ex2]);
await sleep(14000);
out("attempts per job", attempts);
out("completed", done);
out("abort signal fired for stuck job", aborted);
const dead: any[] = await (boss as any).fetch("doc.dead", { batchSize: 10 });
out("dead-letter queue received", dead.map((j) => j.data.name));
const conns = (await pool.query("select coalesce(application_name,'') app, count(*)::int n from pg_stat_activity where datname='spikedb' and pid<>pg_backend_pid() group by 1")).rows;
out("connections: pg-boss(max 3) + other", conns);
await boss.send("doc.process", { name: "slow" }); await sleep(900);
const b = done.length;
await (boss as any).stop({ graceful: true, wait: true, timeout: 8000 });
out("graceful stop: in-flight job completed before exit", done.includes("slow") && done.length > b);
await pool.end(); process.exit(0);
```
