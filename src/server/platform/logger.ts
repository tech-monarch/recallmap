/**
 * Structured JSON logger with secret and personal-data redaction.
 * Redaction is by key name AND by value pattern, so a secret placed in a free-text message is also masked.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const SECRET_KEY =
  /(pass(word)?|secret|token|authorization|cookie|api[-_]?key|session|verifier|credential|database[-_]?url|connection[-_]?string|private[-_]?key|oauth[-_]?code|auth[-_]?code)/i;
const PERSONAL_KEY =
  /^(email|e-mail|name|full[-_]?name|first[-_]?name|last[-_]?name|display[-_]?name|phone|address|avatar(url)?|ip|ip[-_]?address|user[-_]?agent)$/i;
const CONTENT_KEY = /^(text|content|prompt|body|document[-_]?text|answer|response|goals|query)$/i;

const VALUE_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/([a-z][a-z0-9+.-]*:\/\/)([^/\s:@]+):([^@/\s]+)@/gi, "$1[redacted]@"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [redacted]"],
  [/AIza[0-9A-Za-z_-]{20,}/g, "[redacted-key]"],
  [/\b(github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/g, "[redacted-token]"],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, "[redacted-jwt]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
];

const MAX_DEPTH = 6;
const MAX_ARRAY = 50;
const MAX_STRING = 2000;

export function scrubString(input: string): string {
  let out = input;
  for (const [pattern, replacement] of VALUE_PATTERNS) out = out.replace(pattern, replacement);
  return out.length > MAX_STRING ? `${out.slice(0, MAX_STRING)}...[truncated]` : out;
}

export function redact(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return "[unserializable]";
  if (value instanceof Error) return serializeError(value, false);
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[max-depth]";
  if (typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY).map((v) => redact(v, depth + 1, seen));
      return value.length > MAX_ARRAY ? [...items, `[${value.length - MAX_ARRAY} more]`] : items;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SECRET_KEY.test(k)) out[k] = "[redacted]";
      else if (PERSONAL_KEY.test(k) || CONTENT_KEY.test(k)) out[k] = "[redacted]";
      else out[k] = redact(v, depth + 1, seen);
    }
    return out;
  }
  return "[unserializable]";
}

export function serializeError(err: Error, includeStack: boolean) {
  const out: Record<string, unknown> = { name: err.name, message: scrubString(err.message) };
  const code = (err as { code?: unknown }).code;
  if (typeof code === "string" || typeof code === "number") out.code = code;
  if (includeStack && err.stack) out.stack = scrubString(err.stack);
  return out;
}

export type LogSink = (line: string) => void;
export type LoggerOptions = {
  level?: LogLevel;
  sink?: LogSink;
  bindings?: Record<string, unknown>;
  includeStack?: boolean;
  now?: () => Date;
};

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? "info";
  const sink: LogSink = options.sink ?? ((line) => process.stdout.write(`${line}\n`));
  const includeStack = options.includeStack ?? false;
  const now = options.now ?? (() => new Date());
  const base = options.bindings ?? {};

  const emit = (lvl: Exclude<LogLevel, "silent">, msg: string, fields?: Record<string, unknown>) => {
    if (ORDER[lvl] < ORDER[level]) return;
    const entry: Record<string, unknown> = {
      time: now().toISOString(),
      level: lvl,
      msg: scrubString(msg),
      ...(redact(base) as Record<string, unknown>),
    };
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        if (v instanceof Error) entry[k] = serializeError(v, includeStack);
        else if (SECRET_KEY.test(k) || PERSONAL_KEY.test(k) || CONTENT_KEY.test(k)) entry[k] = "[redacted]";
        else entry[k] = redact(v);
      }
    }
    sink(JSON.stringify(entry));
  };

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (bindings) => createLogger({ ...options, bindings: { ...base, ...bindings } }),
  };
}
