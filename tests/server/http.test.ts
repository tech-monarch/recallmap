import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";
import { errorBodySchema, HTTP_STATUS_BY_CODE, ERROR_CODES } from "../../src/contracts/errors";
import { AppError, isDatabaseUnavailable, toAppError } from "../../src/server/platform/errors";
import { createRequestContext } from "../../src/server/platform/request-context";
import { createLogger } from "../../src/server/platform/logger";
import { parseJsonBody, parseQuery, route } from "../../src/server/http/route";

const silent = createLogger({ level: "silent" });

describe("error mapping", () => {
  it("has a status for every code", () => {
    for (const c of ERROR_CODES) expect(HTTP_STATUS_BY_CODE[c]).toBeGreaterThanOrEqual(400);
  });

  it("maps zod errors to validation_failed without input values", () => {
    const parsed = z.object({ age: z.number() }).safeParse({ age: "secret-value" });
    const e = toAppError(parsed.error as ZodError);
    expect(e.code).toBe("validation_failed");
    expect(JSON.stringify(e.details)).not.toContain("secret-value");
  });

  it("recognises database-unavailable conditions", () => {
    expect(isDatabaseUnavailable(Object.assign(new Error("x"), { code: "53300" }))).toBe(true);
    expect(isDatabaseUnavailable(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toBe(true);
    expect(isDatabaseUnavailable(new Error("remaining connection slots are reserved for roles with the SUPERUSER attribute"))).toBe(true);
    expect(isDatabaseUnavailable(new Error("timeout exceeded when trying to connect"))).toBe(true);
    expect(isDatabaseUnavailable(new Error("syntax error"))).toBe(false);
    expect(toAppError(new Error("Connection terminated unexpectedly")).code).toBe("database_unavailable");
  });

  it("hides internals of unknown errors", () => {
    const e = toAppError(new Error("SELECT * FROM users WHERE password='x' failed at /srv/app"));
    expect(e.code).toBe("internal");
    expect(e.message).toBe("Something went wrong.");
  });

  it("maps unique violations to conflict", () => {
    expect(toAppError(Object.assign(new Error("dup"), { code: "23505" })).code).toBe("conflict");
  });
});

describe("request context", () => {
  it("accepts safe inbound ids and replaces unsafe ones", () => {
    expect(createRequestContext("abc12345-XYZ").requestId).toBe("abc12345-XYZ");
    expect(createRequestContext("bad id with spaces").requestId).toMatch(/^req_[0-9a-f]{32}$/);
    expect(createRequestContext("x").requestId).toMatch(/^req_/);
    expect(createRequestContext(null).requestId).toMatch(/^req_/);
  });
});

describe("route wrapper", () => {
  it("returns the standard error envelope with a request id", async () => {
    const handler = route(async () => {
      throw new AppError("not_found", "Nothing here.");
    }, { logger: silent });
    const res = await handler(new Request("http://x/test", { headers: { "x-request-id": "client-id-12345" } }));
    expect(res.status).toBe(404);
    expect(res.headers.get("x-request-id")).toBe("client-id-12345");
    const body = errorBodySchema.parse(await res.json());
    expect(body.error).toMatchObject({ code: "not_found", message: "Nothing here.", requestId: "client-id-12345" });
  });

  it("never leaks stack traces or internal messages", async () => {
    const handler = route(async () => {
      throw new Error("secret internal detail");
    }, { logger: silent });
    const res = await handler(new Request("http://x/"));
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain("secret internal detail");
    expect(text).not.toContain("at ");
  });

  it("passes plain objects through as JSON and keeps Response objects", async () => {
    const a = await route(async () => ({ ok: true }), { logger: silent })(new Request("http://x/"));
    expect(await a.json()).toEqual({ ok: true });
    const b = await route(async () => new Response("hi", { status: 201 }), { logger: silent })(new Request("http://x/"));
    expect(b.status).toBe(201);
    expect(b.headers.get("x-request-id")).toMatch(/^req_/);
  });

  it("validates JSON bodies and queries", async () => {
    const schema = z.object({ n: z.number().int() }).strict();
    await expect(parseJsonBody(new Request("http://x/", { method: "POST", body: "not json" }), schema)).rejects.toMatchObject({ code: "validation_failed" });
    await expect(parseJsonBody(new Request("http://x/", { method: "POST", body: JSON.stringify({ n: "1" }) }), schema)).rejects.toThrow();
    expect(await parseJsonBody(new Request("http://x/", { method: "POST", body: JSON.stringify({ n: 2 }) }), schema)).toEqual({ n: 2 });
    await expect(parseJsonBody(new Request("http://x/", { method: "POST", headers: { "content-length": "9999999" }, body: "{}" }), schema)).rejects.toMatchObject({ code: "payload_too_large" });
    expect(parseQuery(new URL("http://x/?limit=5"), z.object({ limit: z.coerce.number() }))).toEqual({ limit: 5 });
  });
});
