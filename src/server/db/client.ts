import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import type { Logger } from "../platform/logger";
import { getConfig } from "../platform/config";
import { AppError } from "../platform/errors";

export type Db = NodePgDatabase<typeof schema>;
export type DbHandle = Readonly<{ db: Db; pool: pg.Pool; close: () => Promise<void> }>;

export type CreateDbOptions = {
  url: string;
  /** Hard cap for this pool. Budget the sum across pools against the database's connection limit. */
  max: number;
  applicationName: string;
  logger?: Logger;
};

/**
 * One long-lived pool per process and purpose. Never create a pool per request.
 * Moving to a plan with pooling only changes the URL and pool sizes (configuration), not callers.
 */
export function createDb(options: CreateDbOptions): DbHandle {
  const pool = new pg.Pool({
    connectionString: options.url,
    max: options.max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: options.applicationName,
  });
  pool.on("error", (err) => options.logger?.error("database pool error", { err }));
  const db = drizzle(pool, { schema });
  return Object.freeze({ db, pool, close: () => pool.end() });
}

export async function pingDatabase(pool: pg.Pool, timeoutMs = 2000): Promise<{ ok: boolean; ms: number }> {
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      pool.query("select 1"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("database ping timed out")), timeoutMs);
      }),
    ]);
    return { ok: true, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type Slot = "api" | "worker";
const globalKey = Symbol.for("recallmap.db.handles");
type Holder = { [K in Slot]?: DbHandle };
function holder(): Holder {
  const g = globalThis as unknown as Record<symbol, Holder | undefined>;
  return (g[globalKey] ??= {});
}

/** Process-wide handle (survives Next.js module reloads). The API prefers the pooled URL when one exists. */
export function getDbHandle(slot: Slot, logger?: Logger): DbHandle {
  const h = holder();
  const existing = h[slot];
  if (existing) return existing;
  const cfg = getConfig();
  const url = slot === "api" ? (cfg.database.pooledUrl ?? cfg.database.url) : cfg.database.url;
  if (!url) throw new AppError("database_unavailable", "The database is not configured.");
  const handle = createDb({
    url,
    max: slot === "api" ? cfg.database.pool.api : cfg.database.pool.worker,
    applicationName: `recallmap-${slot}`,
    logger,
  });
  h[slot] = handle;
  return handle;
}

export async function closeAllDbHandles(): Promise<void> {
  const h = holder();
  const open = Object.values(h).filter((x): x is DbHandle => Boolean(x));
  h.api = undefined;
  h.worker = undefined;
  await Promise.all(open.map((x) => x.close()));
}
