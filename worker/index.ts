/**
 * Standalone worker entry (npm run worker): your own machine for heavy jobs, later a Render Background Worker.
 * Forces WORKER_MODE=standalone so the connection budget is computed for a worker-only process.
 */
import { closeAllDbHandles, getDbHandle } from "../src/server/db/client";
import { startWorker } from "../src/server/jobs/runtime";
import { ConfigError, describeConfig, loadConfig } from "../src/server/platform/config";
import { createLogger } from "../src/server/platform/logger";

async function main() {
  let config;
  try {
    config = loadConfig({ ...process.env, WORKER_MODE: "standalone" });
  } catch (err) {
    console.error(err instanceof ConfigError ? err.message : "Invalid configuration");
    process.exit(1);
  }
  const logger = createLogger({ level: config.logLevel, includeStack: config.appEnv !== "production" }).child({ component: "standalone-worker" });
  logger.info("starting standalone worker", describeConfig(config));
  // getDbHandle reads the process config; make it see the same standalone-mode values.
  process.env.WORKER_MODE = "standalone";
  const runtime = await startWorker({ config, logger, workerDb: getDbHandle("worker", logger), mode: "standalone" });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("signal received, draining", { signal });
    try {
      await runtime.stop();
      await closeAllDbHandles();
      process.exit(0);
    } catch (err) {
      logger.error("shutdown failed", { err });
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("worker failed to start:", err instanceof Error ? err.message : "unknown error");
  process.exit(1);
});
