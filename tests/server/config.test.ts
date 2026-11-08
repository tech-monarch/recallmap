import { describe, expect, it } from "vitest";
import { ConfigError, describeConfig, loadConfig } from "../../src/server/platform/config";

const DB = "postgres://user:pw@localhost:5432/recallmap_dev";
const ok = (env: Record<string, string | undefined> = {}) => loadConfig({ ...env });

describe("loadConfig", () => {
  it("runs with an empty environment (frontend-only mode)", () => {
    const c = ok();
    expect(c.appEnv).toBe("local");
    expect(c.worker.mode).toBe("off");
    expect(c.ai.dataMode).toBe("synthetic");
    expect(c.database.url).toBeUndefined();
    expect(c.ai.secondaryEnabled).toBe(false);
  });

  it("treats empty strings as unset, for strings, enums, numbers and flags", () => {
    const c = ok({ DATABASE_URL: "", WORKER_MODE: "", APP_ENV: "", AI_DATA_MODE: "", LOG_LEVEL: "", DB_POOL_MAX_API: "", GEMINI_PRIMARY_ENABLED: "", GEMINI_API_KEY_PRIMARY: "  " });
    expect(c.database.url).toBeUndefined();
    expect(c.worker.mode).toBe("off");
    expect(c.appEnv).toBe("local");
    expect(c.ai.dataMode).toBe("synthetic");
    expect(c.database.pool.api).toBe(5);
    expect(c.ai.primaryEnabled).toBe(true);
    expect(c.ai.geminiPrimaryKey).toBeUndefined();
  });

  it("rejects non-postgres database URLs without echoing the value", () => {
    try {
      ok({ DATABASE_URL: "mysql://secretuser:secretpw@host/db" });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError);
      expect((e as Error).message).not.toContain("secretpw");
      expect((e as Error).message).toContain("DATABASE_URL");
    }
  });

  it("requires a database for embedded and standalone workers", () => {
    expect(() => ok({ WORKER_MODE: "embedded" })).toThrow(/DATABASE_URL/);
    expect(() => ok({ WORKER_MODE: "standalone" })).toThrow(/DATABASE_URL/);
    expect(ok({ WORKER_MODE: "embedded", DATABASE_URL: DB }).worker.mode).toBe("embedded");
  });

  it("enforces the connection budget per mode (Aiven free: about 17 usable)", () => {
    // embedded default: 5 + 2 + 3 = 10 <= 17
    expect(ok({ WORKER_MODE: "embedded", DATABASE_URL: DB }).database.pool).toEqual({ api: 5, worker: 2, pgboss: 3 });
    expect(() => ok({ WORKER_MODE: "embedded", DATABASE_URL: DB, DB_POOL_MAX_API: "13" })).toThrow(/DB_CONNECTION_BUDGET/);
    // exactly at the budget is allowed (12 + 2 + 3 = 17)
    expect(ok({ WORKER_MODE: "embedded", DATABASE_URL: DB, DB_POOL_MAX_API: "12" }).database.pool.api).toBe(12);
    // off mode: api + 1 producer connection
    expect(() => ok({ DB_POOL_MAX_API: "17" })).toThrow(/DB_CONNECTION_BUDGET/);
    expect(ok({ DB_POOL_MAX_API: "16" }).database.pool.api).toBe(16);
    // a bigger budget (paid plan) is configuration only
    expect(ok({ WORKER_MODE: "embedded", DATABASE_URL: DB, DB_POOL_MAX_API: "12", DB_CONNECTION_BUDGET: "100" }).database.pool.api).toBe(12);
  });

  it("requires a strong session secret in production", () => {
    expect(() => ok({ APP_ENV: "production", DATABASE_URL: DB })).toThrow(/SESSION_SECRET/);
    expect(() => ok({ APP_ENV: "production", DATABASE_URL: DB, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
    expect(ok({ APP_ENV: "production", DATABASE_URL: DB, SESSION_SECRET: "x".repeat(32) }).isProduction).toBe(true);
  });

  it("guards real learner data in AI: needs production and an approval reference (DR-18)", () => {
    expect(() => ok({ AI_DATA_MODE: "real" })).toThrow(/AI_DATA_MODE/);
    expect(() => ok({ AI_DATA_MODE: "real", APP_ENV: "cloud-dev" })).toThrow(/AI_DATA_MODE/);
    expect(() => ok({ AI_DATA_MODE: "real", APP_ENV: "production", DATABASE_URL: DB, SESSION_SECRET: "x".repeat(32) })).toThrow(/AI_REAL_DATA_APPROVAL_REF/);
    const c = ok({ AI_DATA_MODE: "real", APP_ENV: "production", DATABASE_URL: DB, SESSION_SECRET: "x".repeat(32), AI_REAL_DATA_APPROVAL_REF: "approval-2027-01" });
    expect(c.ai.dataMode).toBe("real");
  });

  it("cannot enable the secondary Gemini key without keys", () => {
    expect(() => ok({ GEMINI_SECONDARY_ENABLED: "true" })).toThrow(/GEMINI_API_KEY_SECONDARY/);
    expect(() => ok({ GEMINI_SECONDARY_ENABLED: "true", GEMINI_API_KEY_SECONDARY: "s" })).toThrow(/GEMINI_API_KEY_PRIMARY/);
    const c = ok({ GEMINI_SECONDARY_ENABLED: "true", GEMINI_API_KEY_SECONDARY: "s", GEMINI_API_KEY_PRIMARY: "p" });
    expect(c.ai.secondaryEnabled).toBe(true);
  });

  it("keeps the idle session TTL within the absolute TTL", () => {
    expect(() => ok({ SESSION_IDLE_TTL_HOURS: "500", SESSION_ABSOLUTE_TTL_HOURS: "100" })).toThrow(/SESSION_IDLE_TTL_HOURS/);
  });

  it("describeConfig exposes presence flags, never secrets", () => {
    const c = ok({ DATABASE_URL: DB, GEMINI_API_KEY_PRIMARY: "AIzaSECRETVALUE1234567890", SESSION_SECRET: "y".repeat(40) });
    const text = JSON.stringify(describeConfig(c));
    expect(text).not.toContain("AIza");
    expect(text).not.toContain("pw@");
    expect(text).not.toContain("yyyy");
    expect(describeConfig(c).geminiPrimaryKeyPresent).toBe(true);
  });

  it("returns a frozen config", () => {
    const c = ok();
    expect(Object.isFrozen(c)).toBe(true);
    expect(Object.isFrozen(c.database)).toBe(true);
  });
});
