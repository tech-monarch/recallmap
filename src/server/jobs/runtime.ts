import { hostname } from "node:os";
import { randomBytes } from "node:crypto";
import { PgBoss } from "pg-boss";
import type { AppConfig } from "../platform/config";
import type { Logger } from "../platform/logger";
import type { DbHandle } from "../db/client";
import { recordHeartbeat, removeHeartbeat, HEARTBEAT_INTERVAL_MS } from "./heartbeat";
import { defaultHandlers, type HandlerRegistry } from "./handlers";
import { PAYLOAD_SCHEMAS } from "./payloads";
import { QUEUE_DEFINITIONS, type QueueName } from "./queues";

export type WorkerRuntime = Readonly<{
  boss: PgBoss;
  instanceId: string;
  mode: "embedded" | "standalone";
  stop: () => Promise<void>;
}>;

export type StartWorkerOptions = {
  config: AppConfig;
  logger: Logger;
  /** Small pool for the worker's own application queries (heartbeats, and later services). */
  workerDb: DbHandle;
  mode: "embedded" | "standalone";
  handlers?: HandlerRegistry;
  /** pg-boss schema name; tests use their own. */
  schema?: string;
  heartbeatIntervalMs?: number;
  pollingIntervalSeconds?: number;
};

export async function ensureQueues(boss: PgBoss): Promise<void> {
  for (const q of QUEUE_DEFINITIONS) await boss.createQueue(q.name, q.options);
}

/**
 * Starts pg-boss with its own small pool on the DIRECT connection, registers consumers (at least two, so one stuck
 * job cannot block the queue), and starts the heartbeat. Handlers receive validated payloads and an AbortSignal.
 */
export async function startWorker(o: StartWorkerOptions): Promise<WorkerRuntime> {
  const url = o.config.database.url;
  if (!url) throw new Error("DATABASE_URL is required to start a worker");
  const log = o.logger.child({ component: "worker", mode: o.mode });
  const instanceId = `${hostname()}-${process.pid}-${randomBytes(3).toString("hex")}`;

  const boss = new PgBoss({
    connectionString: url,
    max: o.config.database.pool.pgboss,
    schema: o.schema ?? "pgboss",
    application_name: "recallmap-pgboss",
  });
  boss.on("error", (err: Error) => log.error("pg-boss error", { err }));
  await boss.start();
  await ensureQueues(boss);

  const handlers = o.handlers ?? defaultHandlers();
  const consumers = Math.max(2, o.config.worker.consumers);
  for (const [queue, fn] of Object.entries(handlers)) {
    if (!fn) continue;
    const schema = PAYLOAD_SCHEMAS[queue as keyof typeof PAYLOAD_SCHEMAS];
    for (let i = 0; i < consumers; i++) {
      await boss.work(queue, { batchSize: 1, pollingIntervalSeconds: o.pollingIntervalSeconds ?? 2 }, async (jobs) => {
        for (const job of jobs) {
          const payload = schema.parse(job.data);
          await fn(payload, {
            jobId: job.id,
            queue: queue as QueueName,
            attempt: (job as { retryCount?: number }).retryCount ?? 0,
            signal: job.signal,
            logger: log.child({ queue, jobId: job.id }),
          });
        }
      });
    }
  }

  const beat = () => recordHeartbeat(o.workerDb.db, instanceId, o.mode).catch((err) => log.warn("heartbeat failed", { err }));
  await beat();
  const timer = setInterval(beat, o.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS);
  timer.unref();

  let stopping: Promise<void> | undefined;
  const stop = () =>
    (stopping ??= (async () => {
      clearInterval(timer);
      // Remove the heartbeat first so the UI stops claiming a worker is running while we drain.
      await removeHeartbeat(o.workerDb.db, instanceId).catch(() => undefined);
      await boss.stop({ graceful: true, timeout: o.config.worker.shutdownTimeoutMs });
      log.info("worker stopped");
    })());

  log.info("worker started", { consumers, queues: Object.keys(handlers).length });
  return Object.freeze({ boss, instanceId, mode: o.mode, stop });
}

/** Producer-only client: can enqueue and read job state without supervising or consuming (WORKER_MODE=off). */
export async function startQueueClient(config: AppConfig, logger: Logger, schema?: string): Promise<PgBoss> {
  const url = config.database.url;
  if (!url) throw new Error("DATABASE_URL is required for the queue client");
  const boss = new PgBoss({ connectionString: url, max: 1, schema: schema ?? "pgboss", application_name: "recallmap-queue-client", supervise: false, schedule: false });
  boss.on("error", (err: Error) => logger.error("queue client error", { err }));
  await boss.start();
  return boss;
}
