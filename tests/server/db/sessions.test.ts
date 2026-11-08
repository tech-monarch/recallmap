import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DbHandle } from "../../../src/server/db/client";
import { SessionRepository } from "../../../src/server/modules/auth/session-repository";
import { SessionService } from "../../../src/server/modules/auth/session-service";
import { generateSessionToken, hashSessionToken } from "../../../src/server/modules/auth/tokens";
import { UsersRepository } from "../../../src/server/modules/users/repository";
import { hasDb, resetAndMigrate } from "./helpers";

const HOUR = 3_600_000;

describe.skipIf(!hasDb)("session lifecycle (real PostgreSQL, injected clock)", () => {
  let h: DbHandle;
  let userId: string;
  let now = new Date("2026-11-05T00:00:00Z");
  let svc: SessionService;
  let repo: SessionRepository;
  const advance = (ms: number) => {
    now = new Date(now.getTime() + ms);
  };

  beforeAll(async () => {
    h = await resetAndMigrate();
    repo = new SessionRepository(h.db);
    svc = new SessionService(repo, { absoluteTtlHours: 24, idleTtlHours: 2, secret: "s".repeat(32) }, () => now);
    userId = await new UsersRepository(h.db).create({ email: "sess@example.com", emailVerified: true });
  });
  afterAll(async () => {
    await h?.close();
  });

  it("stores only the hash, never the token", async () => {
    const s = await svc.create({ userId, userAgent: "UA", ip: "9.9.9.9" });
    const all = await h.pool.query("select * from sessions where id_hash = $1", [hashSessionToken(s.token)]);
    expect(all.rowCount).toBe(1);
    const dump = JSON.stringify((await h.pool.query("select * from sessions")).rows);
    expect(dump).not.toContain(s.token);
    expect(dump).not.toContain("9.9.9.9"); // IP stored only as a keyed hash
    expect(all.rows[0].ip_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("validates a fresh session and rejects malformed tokens without touching the database", async () => {
    const s = await svc.create({ userId });
    expect(await svc.validate(s.token)).toMatchObject({ userId });
    for (const bad of [null, undefined, "", "short", "x".repeat(44), "../../etc/passwd", generateSessionToken()]) expect(await svc.validate(bad)).toBeNull();
  });

  it("expires after the idle window and renews activity on use", async () => {
    const s = await svc.create({ userId });
    advance(1.5 * HOUR);
    expect(await svc.validate(s.token)).not.toBeNull(); // within idle window, touches lastSeen
    advance(1.5 * HOUR);
    expect(await svc.validate(s.token)).not.toBeNull(); // 1.5h since last use
    advance(2.5 * HOUR);
    expect(await svc.validate(s.token)).toBeNull(); // idle for 2.5h
  });

  it("expires at the absolute limit even with continuous use", async () => {
    const s = await svc.create({ userId });
    for (let i = 0; i < 23; i++) {
      advance(1 * HOUR);
      expect(await svc.validate(s.token), `hour ${i + 1}`).not.toBeNull();
    }
    advance(1.5 * HOUR);
    expect(await svc.validate(s.token)).toBeNull();
  });

  it("rotation issues a new token, revokes the old one, and keeps the absolute expiry", async () => {
    const s = await svc.create({ userId });
    advance(5 * 60_000);
    const next = await svc.rotate(s.token);
    expect(next).not.toBeNull();
    expect(next!.token).not.toBe(s.token);
    expect(next!.expiresAt.getTime()).toBe(s.expiresAt.getTime());
    expect(await svc.validate(s.token)).toBeNull();
    expect(await svc.validate(next!.token)).toMatchObject({ userId });
    const old = await h.pool.query("select revoked_at, replaced_by_id_hash from sessions where id_hash=$1", [hashSessionToken(s.token)]);
    expect(old.rows[0].revoked_at).not.toBeNull();
    expect(old.rows[0].replaced_by_id_hash).toBe(hashSessionToken(next!.token));
  });

  it("a rotated-away token cannot be rotated again (no replay)", async () => {
    const s = await svc.create({ userId });
    expect(await svc.rotate(s.token)).not.toBeNull();
    expect(await svc.rotate(s.token)).toBeNull();
  });

  it("stops working immediately when revoked", async () => {
    const s = await svc.create({ userId });
    expect(await svc.revoke({ requestId: "r", userId }, s.sessionId)).toBe(true);
    expect(await svc.validate(s.token)).toBeNull();
  });

  it("stops working when the user is suspended", async () => {
    const other = await new UsersRepository(h.db).create({ email: "susp@example.com", emailVerified: true });
    const s = await svc.create({ userId: other });
    expect(await svc.validate(s.token)).not.toBeNull();
    await h.pool.query("update users set status='suspended' where id=$1", [other]);
    expect(await svc.validate(s.token)).toBeNull();
  });

  it("housekeeping deletes only expired sessions", async () => {
    const before = (await h.pool.query("select count(*)::int n from sessions")).rows[0].n;
    const deleted = await repo.deleteExpiredBefore(new Date(now.getTime() + 1000 * HOUR));
    expect(deleted).toBeGreaterThan(0);
    expect(before).toBeGreaterThanOrEqual(deleted);
    expect((await h.pool.query("select count(*)::int n from sessions")).rows[0].n).toBe(before - deleted);
  });
});
