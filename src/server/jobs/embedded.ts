import { getConfig, describeConfig } from "../platform/config";
import { createLogger, type Logger } from "../platform/logger";
import { getDbHandle } from "../db/client";
import { startWorker, type WorkerRuntime } from "./runtime";

/**
 * Embedded worker for the Render free tier: runs inside the web process while it is awake.
 * NOT production background processing: a sleeping service runs nothing (see docs/deployment/FREE_TIER_INFRASTRUCTURE.md).
 * Guaranteed to start at most once per process, even if called repeatedly or after module reloads.
 */
const KEY = Symbol.for("recallmap.worker.embedded");
const SIGNALS_KEY = Symbol.for("recallmap.worker.embedded.signals");
type G = Record<symbol, Promise<WorkerRuntime | null> | boolean | undefined>;

export function startEmbeddedWorkerOnce(logger?: Logger): Promise<WorkerRuntime | null> {
  const g = globalThis as unknown as G;
  const existing = g[KEY];
  if (existing) return existing as Promise<WorkerRuntime | null>;

  const started = (async (): Promise<WorkerRuntime | null> => {
    let config;
    try {
      config = getConfig();
    } catch (err) {
      (logger ?? createLogger()).error("embedded worker not started: invalid configuration", { err });
      return null;
    }
    if (config.worker.mode !== "embedded") return null;
    const log = (logger ?? createLogger({ level: config.logLevel })).child({ component: "embedded-worker" });
    log.info("starting embedded worker", describeConfig(config));
    try {
      const runtime = await startWorker({ config, logger: log, workerDb: getDbHandle("worker", log), mode: "embedded" });
      registerShutdown(runtime, log);
      return runtime;
    } catch (err) {
      log.error("embedded worker failed to start", { err });
      g[KEY] = undefined; // allow a later retry
      return null;
    }
  })();
  g[KEY] = started;
  return started;
}

function registerShutdown(runtime: WorkerRuntime, log: Logger): void {
  const g = globalThis as unknown as G;
  if (g[SIGNALS_KEY]) return;
  g[SIGNALS_KEY] = true;

  // Next.js ends its own SIGTERM cleanup with process.exit(143) as soon as it is idle, which would cut our drain short.
  // From the moment a shutdown signal arrives (and only then) we hold process.exit until the bounded drain
  // (WORKER_SHUTDOWN_TIMEOUT_MS) has finished. Before a signal, process.exit is untouched.
  const realExit = process.exit.bind(process);
  let draining: Promise<void> | undefined;
  const drain = () =>
    (draining ??= runtime.stop().catch((err) => {
      log.error("embedded worker shutdown failed", { err });
    }));
  process.exit = ((code?: number | string | null) => {
    if (!draining) return realExit(code);
    void draining.finally(() => realExit(code));
    return undefined as never;
  }) as typeof process.exit;

  const handler = (signal: string) => {
    log.info("signal received, draining embedded worker", { signal });
    void drain();
  };
  process.once("SIGTERM", () => handler("SIGTERM"));
  process.once("SIGINT", () => handler("SIGINT"));
}

export async function stopEmbeddedWorker(): Promise<void> {
  const g = globalThis as unknown as G;
  const p = g[KEY] as Promise<WorkerRuntime | null> | undefined;
  g[KEY] = undefined;
  const runtime = p ? await p : null;
  await runtime?.stop();
}
