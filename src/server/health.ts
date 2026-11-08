import type { HealthResponse } from "../contracts/health";
import { getDbHandle, pingDatabase } from "./db/client";
import { isWorkerAlive } from "./jobs/heartbeat";
import { getConfig } from "./platform/config";

type Checks = HealthResponse["checks"];

/**
 * ok:       everything configured is working.
 * degraded: running, but something expected is missing (no database configured, or a worker is expected and silent).
 * down:     configuration invalid, or a configured database is unreachable. The route returns 503.
 */
export function computeStatus(checks: Checks): HealthResponse["status"] {
  if (checks.config === "invalid") return "down";
  if (checks.database === "unavailable") return "down";
  if (checks.database === "not_configured") return "degraded";
  if (checks.worker.mode !== "off" && checks.worker.state !== "running") return "degraded";
  return "ok";
}

export async function buildHealth(now: () => Date = () => new Date()): Promise<HealthResponse> {
  let config;
  try {
    config = getConfig();
  } catch {
    return {
      status: "down",
      time: now().toISOString(),
      checks: { config: "invalid", database: "not_configured", worker: { mode: "off", state: "unknown" } },
    };
  }

  let database: Checks["database"] = "not_configured";
  let workerState: Checks["worker"]["state"] = config.worker.mode === "off" ? "not_applicable" : "unknown";

  if (config.database.url) {
    const handle = getDbHandle("api");
    const ping = await pingDatabase(handle.pool, 2000);
    database = ping.ok ? "ok" : "unavailable";
    if (ping.ok && config.worker.mode !== "off") {
      workerState = await isWorkerAlive(handle.db).then((alive) => (alive ? "running" : "not_running"), () => "unknown" as const);
    }
  }

  const checks: Checks = { config: "ok", database, worker: { mode: config.worker.mode, state: workerState } };
  return { status: computeStatus(checks), time: now().toISOString(), checks };
}
