import { z } from "zod";

/**
 * Environment configuration, validated with Zod. Nothing here reads the browser or Next.js.
 * Error messages never include variable values (they may be secrets).
 */

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const boolFlag = (fallback: boolean) =>
  z
    .preprocess(emptyToUndefined, z.enum(["true", "false"]).optional())
    .transform((v) => (v === undefined ? fallback : v === "true"));
const intFlag = (fallback: number, min: number, max: number) =>
  z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional())
    .transform((v) => v ?? fallback);
/** Enum that treats an empty value (for example `WORKER_MODE=` in a .env file) as unset. */
const enumFlag = <T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.preprocess(emptyToUndefined, z.enum(values).optional()).transform((v) => (v ?? fallback) as T[number]);
const postgresUrl = z
  .string()
  .refine((v) => /^postgres(ql)?:\/\/.+/.test(v), { message: "must be a postgres:// or postgresql:// URL" });

const envSchema = z
  .object({
    APP_ENV: enumFlag(["local", "cloud-dev", "production"] as const, "local"),
    NODE_ENV: enumFlag(["development", "test", "production"] as const, "development"),
    LOG_LEVEL: enumFlag(["debug", "info", "warn", "error", "silent"] as const, "info"),

    DATABASE_URL: z.preprocess(emptyToUndefined, postgresUrl.optional()),
    DATABASE_POOLED_URL: z.preprocess(emptyToUndefined, postgresUrl.optional()),
    DB_CONNECTION_BUDGET: intFlag(17, 3, 500),
    DB_POOL_MAX_API: intFlag(5, 1, 100),
    DB_POOL_MAX_WORKER: intFlag(2, 1, 50),
    PGBOSS_POOL_MAX: intFlag(3, 1, 50),

    WORKER_MODE: enumFlag(["embedded", "standalone", "off"] as const, "off"),
    WORKER_CONSUMERS: intFlag(2, 1, 8),
    WORKER_SHUTDOWN_TIMEOUT_MS: intFlag(25_000, 1_000, 120_000),

    AI_DATA_MODE: enumFlag(["synthetic", "real"] as const, "synthetic"),
    AI_REAL_DATA_APPROVAL_REF: optionalString,
    GEMINI_API_KEY_PRIMARY: optionalString,
    GEMINI_API_KEY_SECONDARY: optionalString,
    GEMINI_PRIMARY_ENABLED: boolFlag(true),
    GEMINI_SECONDARY_ENABLED: boolFlag(false),

    SESSION_SECRET: optionalString,
    SESSION_ABSOLUTE_TTL_HOURS: intFlag(24 * 14, 1, 24 * 90),
    SESSION_IDLE_TTL_HOURS: intFlag(24 * 7, 1, 24 * 30),

    DEV_MAX_UPLOAD_MB: intFlag(5, 1, 100),
    DEV_MAX_PAGES: intFlag(20, 1, 500),
  })
  .superRefine((env, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    // Connection budget (Aiven free: 20 connections, no pooling, about 17 usable).
    const needed =
      env.WORKER_MODE === "off"
        ? env.DB_POOL_MAX_API + 1 // +1: producer-only queue client (enqueue and status reads, no worker)
        : env.WORKER_MODE === "embedded"
          ? env.DB_POOL_MAX_API + env.DB_POOL_MAX_WORKER + env.PGBOSS_POOL_MAX
          : env.DB_POOL_MAX_WORKER + env.PGBOSS_POOL_MAX;
    if (needed > env.DB_CONNECTION_BUDGET) {
      add("DB_POOL_MAX_API", `configured pools need ${needed} connections but DB_CONNECTION_BUDGET is ${env.DB_CONNECTION_BUDGET}`);
    }

    if (env.WORKER_MODE !== "off" && !env.DATABASE_URL) add("DATABASE_URL", "required when WORKER_MODE is embedded or standalone");
    if (env.APP_ENV === "production" && !env.DATABASE_URL) add("DATABASE_URL", "required when APP_ENV is production");
    if (env.APP_ENV === "production" && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
      add("SESSION_SECRET", "required (at least 32 characters) when APP_ENV is production");
    }
    if (env.SESSION_SECRET !== undefined && env.SESSION_SECRET.length < 32) add("SESSION_SECRET", "must be at least 32 characters");
    if (env.SESSION_IDLE_TTL_HOURS > env.SESSION_ABSOLUTE_TTL_HOURS) {
      add("SESSION_IDLE_TTL_HOURS", "must not exceed SESSION_ABSOLUTE_TTL_HOURS");
    }

    // DR-18 guard: real learner data may only reach an AI provider with an explicit approval reference.
    if (env.AI_DATA_MODE === "real") {
      if (env.APP_ENV !== "production") add("AI_DATA_MODE", "real is only allowed when APP_ENV is production");
      if (!env.AI_REAL_DATA_APPROVAL_REF) add("AI_REAL_DATA_APPROVAL_REF", "required when AI_DATA_MODE is real");
    }
    if (env.GEMINI_SECONDARY_ENABLED && !env.GEMINI_API_KEY_SECONDARY) {
      add("GEMINI_API_KEY_SECONDARY", "required when GEMINI_SECONDARY_ENABLED is true");
    }
    if (env.GEMINI_PRIMARY_ENABLED && env.GEMINI_API_KEY_PRIMARY === undefined && env.GEMINI_SECONDARY_ENABLED) {
      add("GEMINI_API_KEY_PRIMARY", "the secondary key is a fallback and cannot be enabled without a primary key");
    }
  });

export type AppConfig = Readonly<{
  appEnv: "local" | "cloud-dev" | "production";
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  logLevel: "debug" | "info" | "warn" | "error" | "silent";
  database: Readonly<{
    url?: string;
    pooledUrl?: string;
    budget: number;
    pool: Readonly<{ api: number; worker: number; pgboss: number }>;
  }>;
  worker: Readonly<{ mode: "embedded" | "standalone" | "off"; consumers: number; shutdownTimeoutMs: number }>;
  ai: Readonly<{
    dataMode: "synthetic" | "real";
    realDataApprovalRef?: string;
    geminiPrimaryKey?: string;
    geminiSecondaryKey?: string;
    primaryEnabled: boolean;
    secondaryEnabled: boolean;
  }>;
  session: Readonly<{ secret?: string; absoluteTtlHours: number; idleTtlHours: number }>;
  limits: Readonly<{ devMaxUploadMb: number; devMaxPages: number }>;
}>;

export class ConfigError extends Error {
  readonly issues: ReadonlyArray<{ path: string; message: string }>;
  constructor(issues: ReadonlyArray<{ path: string; message: string }>) {
    super(`Invalid configuration: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => ({ path: i.path.join(".") || "(env)", message: i.message })));
  }
  const e = parsed.data;
  return Object.freeze({
    appEnv: e.APP_ENV,
    nodeEnv: e.NODE_ENV,
    isProduction: e.APP_ENV === "production",
    logLevel: e.LOG_LEVEL,
    database: Object.freeze({
      url: e.DATABASE_URL,
      pooledUrl: e.DATABASE_POOLED_URL,
      budget: e.DB_CONNECTION_BUDGET,
      pool: Object.freeze({ api: e.DB_POOL_MAX_API, worker: e.DB_POOL_MAX_WORKER, pgboss: e.PGBOSS_POOL_MAX }),
    }),
    worker: Object.freeze({ mode: e.WORKER_MODE, consumers: e.WORKER_CONSUMERS, shutdownTimeoutMs: e.WORKER_SHUTDOWN_TIMEOUT_MS }),
    ai: Object.freeze({
      dataMode: e.AI_DATA_MODE,
      realDataApprovalRef: e.AI_REAL_DATA_APPROVAL_REF,
      geminiPrimaryKey: e.GEMINI_API_KEY_PRIMARY,
      geminiSecondaryKey: e.GEMINI_API_KEY_SECONDARY,
      primaryEnabled: e.GEMINI_PRIMARY_ENABLED,
      secondaryEnabled: e.GEMINI_SECONDARY_ENABLED,
    }),
    session: Object.freeze({
      secret: e.SESSION_SECRET,
      absoluteTtlHours: e.SESSION_ABSOLUTE_TTL_HOURS,
      idleTtlHours: e.SESSION_IDLE_TTL_HOURS,
    }),
    limits: Object.freeze({ devMaxUploadMb: e.DEV_MAX_UPLOAD_MB, devMaxPages: e.DEV_MAX_PAGES }),
  });
}

/** Safe-to-log summary: presence flags only, never values. */
export function describeConfig(c: AppConfig) {
  return {
    appEnv: c.appEnv,
    workerMode: c.worker.mode,
    aiDataMode: c.ai.dataMode,
    databaseConfigured: Boolean(c.database.url),
    pooledUrlConfigured: Boolean(c.database.pooledUrl),
    pools: c.database.pool,
    geminiPrimaryKeyPresent: Boolean(c.ai.geminiPrimaryKey),
    geminiSecondaryEnabled: c.ai.secondaryEnabled,
    sessionSecretPresent: Boolean(c.session.secret),
  };
}

let cached: AppConfig | undefined;
export function getConfig(): AppConfig {
  return (cached ??= loadConfig());
}
/** Test hook. */
export function resetConfigCache(): void {
  cached = undefined;
}
