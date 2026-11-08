import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PgBoss } from "pg-boss";
import { closeAllDbHandles, type DbHandle } from "../../../src/server/db/client";
import { isWorkerAlive } from "../../../src/server/jobs/heartbeat";
import type { HandlerRegistry } from "../../../src/server/jobs/handlers";
import { QUEUES } from "../../../src/server/jobs/queues";
import { ensureQueues, startQueueClient, startWorker, type WorkerRuntime } from "../../../src/server/jobs/runtime";
import { startEmbeddedWorkerOnce, stopEmbeddedWorker } from "../../../src/server/jobs/embedded";
import { JobStatusService } from "../../../src/server/jobs/status";
import { loadConfig, resetConfigCache } from "../../../src/server/platform/config";
import { createLogger } from "../../../src/server/platform/logger";
import { TEST_URL, hasDb, resetAndMigrate } from "./helpers";

const silent = createLogger({ level: "silent" });
const SCHEMA = "pgboss_test";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => Promise<boolean> | boolean, timeoutMs = 20_000, stepMs = 150) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(stepMs);
  }
  throw new Error("condition not met in time");
}

describe.skipIf(!hasDb)("worker, queue and status (real PostgreSQL)", () => {
  let h: DbHandle;
  const config = () => loadConfig({ DATABASE_URL: TEST_URL, WORKER_MODE: "standalone", PGBOSS_POOL_MAX: "3", DB_POOL_MAX_WORKER: "2" });
  let worker: WorkerRuntime | undefined;
  let client: PgBoss | undefined;

  beforeAll(async () => {
    h = await resetAndMigrate();
  });
  afterEach(async () => {
    await worker?.stop().catch(() => undefined);
    worker = undefined;
    await client?.stop({ graceful: false, timeout: 2000 }).catch(() => undefined);
    client = undefined;
    await h.pool.query("delete from worker_heartbeats");
  });
  afterAll(async () => {
    await closeAllDbHandles();
    await h?.close();
  });

  const startTestWorker = (handlers: HandlerRegistry) =>
    startWorker({ config: config(), logger: silent, workerDb: h, mode: "standalone", handlers, schema: SCHEMA, pollingIntervalSeconds: 0.5, heartbeatIntervalMs: 500 });

  it("reports a queued job as waiting (not completed) while no worker runs, then completes once a worker starts", async () => {
    client = await startQueueClient(config(), silent, SCHEMA);
    await ensureQueues(client);
    const id = (await client.send(QUEUES.ping, { nonce: "n1" }))!;
    const status = new JobStatusService(client, h.db);

    const before = await status.describe(QUEUES.ping, id);
    expect(before.state).toBe("queued");
    expect(before.workerAlive).toBe(false);
    expect(before.note).toMatch(/nothing has been processed yet/i);
    expect(before.state).not.toBe("completed");

    const handled: string[] = [];
    worker = await startTestWorker({ [QUEUES.ping]: async (p) => void handled.push((p as { nonce: string }).nonce) });
    await until(async () => (await status.describe(QUEUES.ping, id)).state === "completed");
    expect(handled).toEqual(["n1"]);
    const after = await status.describe(QUEUES.ping, id);
    expect(after.workerAlive).toBe(true);
    expect(after.note).toBe("Finished.");
  });

  it("retries a failing job and passes the attempt number", async () => {
    const attempts: number[] = [];
    worker = await startTestWorker({
      [QUEUES.ping]: async (_p, ctx) => {
        attempts.push(ctx.attempt);
        if (ctx.attempt === 0) throw new Error("transient");
      },
    });
    const id = (await worker.boss.send(QUEUES.ping, { nonce: "retry" }))!;
    await until(async () => (await worker!.boss.getJobById(QUEUES.ping, id))?.state === "completed", 25_000);
    expect(attempts).toEqual([0, 1]);
  });

  it("rejects invalid payloads at the boundary (handler never runs)", async () => {
    let ran = false;
    worker = await startTestWorker({ [QUEUES.ping]: async () => void (ran = true) });
    const id = (await worker.boss.send(QUEUES.ping, { wrong: true }, { retryLimit: 0 }))!;
    await until(async () => (await worker!.boss.getJobById(QUEUES.ping, id))?.state === "failed");
    expect(ran).toBe(false);
  });

  it("deduplicates document processing by singletonKey (exclusive queue)", async () => {
    client = await startQueueClient(config(), silent, SCHEMA);
    await ensureQueues(client);
    const payload = { materialId: "22222222-2222-4222-8222-222222222222", userId: "11111111-1111-4111-8111-111111111111", pipelineVersion: 1 };
    const first = await client.send(QUEUES.documentProcess, payload, { singletonKey: payload.materialId });
    const second = await client.send(QUEUES.documentProcess, payload, { singletonKey: payload.materialId });
    expect(first).toBeTruthy();
    expect(second).toBeNull();
  });

  it("drains in-flight work on graceful stop and removes the heartbeat first", async () => {
    let started = false;
    let finished = false;
    worker = await startTestWorker({
      [QUEUES.ping]: async () => {
        started = true;
        await sleep(1500);
        finished = true;
      },
    });
    const id = (await worker.boss.send(QUEUES.ping, { nonce: "slow" }))!;
    await until(() => started);
    expect(await isWorkerAlive(h.db)).toBe(true);
    const stopping = worker.stop();
    await until(async () => !(await isWorkerAlive(h.db)), 5000, 50); // heartbeat removed before the drain ends
    await stopping;
    expect(finished).toBe(true);
    expect((await h.pool.query("select count(*)::int n from worker_heartbeats")).rows[0].n).toBe(0);
    // Completed state is recorded by the queue, not assumed.
    client = await startQueueClient(config(), silent, SCHEMA);
    expect((await client.getJobById(QUEUES.ping, id))?.state).toBe("completed");
    worker = undefined;
  });

  it("stays within its connection budget", async () => {
    worker = await startTestWorker({ [QUEUES.ping]: async () => undefined });
    for (let i = 0; i < 6; i++) await worker.boss.send(QUEUES.ping, { nonce: `b${i}` });
    await sleep(1500);
    const { rows } = await h.pool.query("select application_name app, count(*)::int n from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() group by 1");
    const by = Object.fromEntries(rows.map((r) => [r.app, r.n]));
    const pgbossConns = Object.entries(by).filter(([k]) => k.startsWith("recallmap-pgboss") || k.startsWith("pgboss")).reduce((s, [, n]) => s + (n as number), 0);
    expect(pgbossConns).toBeLessThanOrEqual(3);
    expect(Number(by["recallmap-test"] ?? 0)).toBeLessThanOrEqual(3);
  });

  it("starts the embedded worker exactly once per process, however often it is requested", async () => {
    const saved = { ...process.env };
    try {
      process.env.DATABASE_URL = TEST_URL;
      process.env.WORKER_MODE = "embedded";
      process.env.DB_POOL_MAX_API = "3";
      resetConfigCache();
      const [a, b, c] = await Promise.all([startEmbeddedWorkerOnce(silent), startEmbeddedWorkerOnce(silent), startEmbeddedWorkerOnce(silent)]);
      expect(a).not.toBeNull();
      expect(b).toBe(a);
      expect(c).toBe(a);
      expect(await startEmbeddedWorkerOnce(silent)).toBe(a);
      const beats = await h.pool.query("select mode from worker_heartbeats");
      expect(beats.rows).toEqual([{ mode: "embedded" }]);
      await stopEmbeddedWorker();
      expect(await isWorkerAlive(h.db)).toBe(false);
    } finally {
      process.env = saved;
      resetConfigCache();
      await closeAllDbHandles();
    }
  });

  it("does not start an embedded worker when the mode is off or the configuration is invalid", async () => {
    const saved = { ...process.env };
    try {
      process.env.WORKER_MODE = "off";
      resetConfigCache();
      await stopEmbeddedWorker();
      expect(await startEmbeddedWorkerOnce(silent)).toBeNull();
      await stopEmbeddedWorker();
      process.env.WORKER_MODE = "embedded";
      delete process.env.DATABASE_URL; // invalid: embedded needs a database
      resetConfigCache();
      expect(await startEmbeddedWorkerOnce(silent)).toBeNull();
    } finally {
      process.env = saved;
      resetConfigCache();
      await stopEmbeddedWorker();
    }
  });
});
