import { describe, expect, it } from "vitest";
import { InMemoryObjectStore, originalObjectKey, assertSafeKey } from "../../src/server/providers/storage";
import { computeStatus } from "../../src/server/health";
import { healthResponseSchema } from "../../src/contracts/health";
import { PAYLOAD_SCHEMAS } from "../../src/server/jobs/payloads";
import { QUEUES, QUEUE_DEFINITIONS } from "../../src/server/jobs/queues";

const U = "11111111-1111-4111-8111-111111111111";
const M = "22222222-2222-4222-8222-222222222222";

describe("object keys", () => {
  it("are server-generated from uuids and never from filenames", () => {
    expect(originalObjectKey(U, M)).toBe(`u/${U}/m/${M}/original`);
    expect(() => originalObjectKey("../etc/passwd", M)).toThrow();
    expect(() => originalObjectKey(U, "not-a-uuid")).toThrow();
  });
  it("reject traversal and foreign shapes", () => {
    for (const bad of ["../x", `u/${U}/m/${M}/../../x`, "/etc/passwd", `u/${U}/m/${M}/Original`, `u/${U}/m/${M}/a/b`, ""]) expect(() => assertSafeKey(bad)).toThrow();
    expect(() => assertSafeKey(originalObjectKey(U, M))).not.toThrow();
  });
});

describe("InMemoryObjectStore", () => {
  it("puts, heads, gets and deletes", async () => {
    const s = new InMemoryObjectStore();
    const key = originalObjectKey(U, M);
    expect(await s.head(key)).toBeNull();
    await s.put(key, new Uint8Array([1, 2, 3]), "application/pdf");
    expect(await s.head(key)).toEqual({ key, size: 3, contentType: "application/pdf" });
    expect(Array.from((await s.get(key))!)).toEqual([1, 2, 3]);
    await s.delete(key);
    expect(s.size).toBe(0);
  });
  it("issues upload targets that sign type and exact length, and rejects bad input", async () => {
    const s = new InMemoryObjectStore();
    const t = await s.createUploadTarget({ key: originalObjectKey(U, M), contentType: "application/pdf", contentLength: 1234, expiresInSeconds: 600 });
    expect(t.method).toBe("PUT");
    expect(t.headers["Content-Length"]).toBe("1234");
    expect(t.headers["Content-Type"]).toBe("application/pdf");
    await expect(s.createUploadTarget({ key: originalObjectKey(U, M), contentType: "x", contentLength: 0, expiresInSeconds: 60 })).rejects.toThrow();
    await expect(s.createUploadTarget({ key: "../evil", contentType: "x", contentLength: 5, expiresInSeconds: 60 })).rejects.toThrow();
  });
});

describe("health status", () => {
  const base = { config: "ok", database: "ok", worker: { mode: "off", state: "not_applicable" } } as const;
  it("is ok when everything configured works", () => expect(computeStatus(base)).toBe("ok"));
  it("is down when config is invalid or a configured database is unreachable", () => {
    expect(computeStatus({ ...base, config: "invalid" })).toBe("down");
    expect(computeStatus({ ...base, database: "unavailable" })).toBe("down");
  });
  it("is degraded without a database or with a silent worker", () => {
    expect(computeStatus({ ...base, database: "not_configured" })).toBe("degraded");
    expect(computeStatus({ ...base, worker: { mode: "embedded", state: "not_running" } })).toBe("degraded");
    expect(computeStatus({ ...base, worker: { mode: "embedded", state: "running" } })).toBe("ok");
  });
  it("response schema exposes only enumerations", () => {
    const parsed = healthResponseSchema.safeParse({ status: "ok", time: "t", checks: { config: "ok", database: "ok", worker: { mode: "off", state: "not_applicable" } } });
    expect(parsed.success).toBe(true);
    expect(healthResponseSchema.safeParse({ status: "ok", time: "t", checks: { config: "ok", database: "postgres://secret", worker: { mode: "off", state: "x" } } }).success).toBe(false);
  });
});

describe("job payloads and queues", () => {
  it("validate payloads at the boundary", () => {
    expect(PAYLOAD_SCHEMAS[QUEUES.ping].safeParse({ nonce: "n" }).success).toBe(true);
    expect(PAYLOAD_SCHEMAS[QUEUES.ping].safeParse({}).success).toBe(false);
    expect(PAYLOAD_SCHEMAS[QUEUES.documentProcess].safeParse({ materialId: M, userId: U, pipelineVersion: 1 }).success).toBe(true);
    expect(PAYLOAD_SCHEMAS[QUEUES.documentProcess].safeParse({ materialId: "x", userId: U, pipelineVersion: 1 }).success).toBe(false);
  });
  it("document processing deduplicates (exclusive) and dead-letters", () => {
    const def = QUEUE_DEFINITIONS.find((q) => q.name === QUEUES.documentProcess)!;
    expect(def.options).toMatchObject({ policy: "exclusive", deadLetter: QUEUES.documentDead });
    expect(QUEUE_DEFINITIONS.some((q) => q.name === QUEUES.documentDead)).toBe(true);
  });
});
