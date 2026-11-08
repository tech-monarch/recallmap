import { eq, gt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { workerHeartbeats } from "../db/schema";

export const HEARTBEAT_INTERVAL_MS = 15_000;
export const HEARTBEAT_ALIVE_WINDOW_MS = 45_000;

export async function recordHeartbeat(db: Db, instanceId: string, mode: "embedded" | "standalone"): Promise<void> {
  await db
    .insert(workerHeartbeats)
    .values({ instanceId, mode })
    .onConflictDoUpdate({ target: workerHeartbeats.instanceId, set: { lastSeenAt: sql`now()`, mode } });
}

export async function removeHeartbeat(db: Db, instanceId: string): Promise<void> {
  await db.delete(workerHeartbeats).where(eq(workerHeartbeats.instanceId, instanceId));
}

/** True if any worker reported in recently. A sleeping Render service reports nothing, so this turns false. */
export async function isWorkerAlive(db: Db, windowMs: number = HEARTBEAT_ALIVE_WINDOW_MS): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowMs);
  const rows = await db.select({ id: workerHeartbeats.instanceId }).from(workerHeartbeats).where(gt(workerHeartbeats.lastSeenAt, cutoff)).limit(1);
  return rows.length > 0;
}
