import { describe, expect, it } from "vitest";
import { createLogger, redact, scrubString } from "../../src/server/platform/logger";

function capture(level: "debug" | "info" | "warn" | "error" | "silent" = "debug") {
  const lines: string[] = [];
  const logger = createLogger({ level, sink: (l) => lines.push(l), now: () => new Date("2026-11-05T00:00:00Z") });
  return { logger, lines, last: () => JSON.parse(lines[lines.length - 1]) as Record<string, unknown> };
}

describe("logger redaction", () => {
  it("masks secrets by key name", () => {
    const { logger, last } = capture();
    logger.info("login", { password: "hunter2", apiKey: "k", authorization: "Bearer abc", sessionToken: "t", database_url: "postgres://u:p@h/db", ok: 1 });
    const e = last();
    for (const k of ["password", "apiKey", "authorization", "sessionToken", "database_url"]) expect(e[k]).toBe("[redacted]");
    expect(e.ok).toBe(1);
  });

  it("masks personal data and learner content by key name", () => {
    const { logger, last } = capture();
    logger.info("evt", { email: "ada@example.com", name: "Ada", ip: "1.2.3.4", userAgent: "UA", goals: "pass JAMB", prompt: "explain...", answer: "42", text: "doc body" });
    const e = last();
    for (const k of ["email", "name", "ip", "userAgent", "goals", "prompt", "answer", "text"]) expect(e[k]).toBe("[redacted]");
  });

  it("masks secrets that appear inside free text values", () => {
    const s = scrubString(
      "conn postgres://admin:s3cret@db.example.com:5432/x key AIza12345678901234567890ABCD tok github_pat_11ABCDEFGH0123456789_abcdefghijklmnop Bearer abcdef1234567890 jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig mail ada@example.com",
    );
    for (const secret of ["s3cret", "AIza1234", "github_pat_11ABC", "abcdef1234567890", "eyJhbGci", "ada@example.com"]) expect(s).not.toContain(secret);
    expect(s).toContain("[email]");
  });

  it("scrubs the log message itself", () => {
    const { logger, lines } = capture();
    logger.error("failed for ada@example.com using AIza12345678901234567890ABCD");
    expect(lines[0]).not.toContain("ada@example.com");
    expect(lines[0]).not.toContain("AIza1234");
  });

  it("serializes errors without stack by default and scrubs the message", () => {
    const { logger, last } = capture();
    logger.error("boom", { err: Object.assign(new Error("db postgres://u:pw@h/db down"), { code: "ECONNREFUSED" }) });
    const e = last().err as Record<string, unknown>;
    expect(e.name).toBe("Error");
    expect(e.code).toBe("ECONNREFUSED");
    expect(String(e.message)).not.toContain("pw@");
    expect(e.stack).toBeUndefined();
  });

  it("handles circular structures, depth and long arrays", () => {
    const a: Record<string, unknown> = { n: 1 };
    a.self = a;
    const out = redact(a) as Record<string, unknown>;
    expect(out.self).toBe("[circular]");
    expect((redact(Array.from({ length: 80 }, (_, i) => i)) as unknown[]).length).toBe(51);
    let deep: Record<string, unknown> = { v: "x" };
    for (let i = 0; i < 12; i++) deep = { d: deep };
    expect(JSON.stringify(redact(deep))).toContain("[max-depth]");
  });

  it("respects levels and child bindings (also redacted)", () => {
    const { logger, lines } = capture("warn");
    logger.info("hidden");
    logger.child({ requestId: "req_1", userEmail: "x@y.org" }).warn("shown", { n: 1 });
    expect(lines).toHaveLength(1);
    const e = JSON.parse(lines[0]);
    expect(e.requestId).toBe("req_1");
    expect(e.userEmail).not.toContain("x@y.org");
  });

  it("does not redact error codes", () => {
    const { logger, last } = capture();
    logger.warn("rejected", { code: "validation_failed", status: 400 });
    expect(last().code).toBe("validation_failed");
  });
});
