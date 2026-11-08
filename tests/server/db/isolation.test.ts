import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DbHandle } from "../../../src/server/db/client";
import { PreferencesRepository } from "../../../src/server/modules/preferences/repository";
import { PreferencesService } from "../../../src/server/modules/preferences/service";
import { SessionRepository } from "../../../src/server/modules/auth/session-repository";
import { SessionService } from "../../../src/server/modules/auth/session-service";
import { UsersRepository } from "../../../src/server/modules/users/repository";
import { ctx, hasDb, resetAndMigrate } from "./helpers";

describe.skipIf(!hasDb)("per-user data isolation (real PostgreSQL)", () => {
  let h: DbHandle;
  let a: string;
  let b: string;
  let prefs: PreferencesService;
  let prefRepo: PreferencesRepository;
  let sessionRepo: SessionRepository;
  let sessions: SessionService;
  let users: UsersRepository;

  beforeAll(async () => {
    h = await resetAndMigrate();
    users = new UsersRepository(h.db);
    prefRepo = new PreferencesRepository(h.db);
    prefs = new PreferencesService(prefRepo);
    sessionRepo = new SessionRepository(h.db);
    sessions = new SessionService(sessionRepo, { absoluteTtlHours: 24, idleTtlHours: 12, secret: "s".repeat(32) });
    a = await users.create({ email: "alice@example.com", emailVerified: true, name: "Alice" });
    b = await users.create({ email: "bob@example.com", emailVerified: true, name: "Bob" });
  });
  afterAll(async () => {
    await h?.close();
  });

  it("returns each user only their own profile", async () => {
    expect((await users.getProfile(ctx(a)))?.email).toBe("alice@example.com");
    expect((await users.getProfile(ctx(b)))?.email).toBe("bob@example.com");
  });

  it("keeps app preferences separate and updates only the caller's row", async () => {
    await prefs.updateApp(ctx(a), { theme: "dark", mapLayout: "dynamic" });
    expect(await prefs.getApp(ctx(a))).toMatchObject({ theme: "dark", mapLayout: "dynamic" });
    expect(await prefs.getApp(ctx(b))).toMatchObject({ theme: "system", mapLayout: "hierarchical" }); // defaults, untouched
    await prefs.updateApp(ctx(b), { theme: "light" });
    expect((await prefs.getApp(ctx(a))).theme).toBe("dark");
    expect((await prefs.getApp(ctx(b))).theme).toBe("light");
  });

  it("keeps learning preferences separate", async () => {
    await prefs.updateLearning(ctx(a), { goals: "alice goals", explanationStyle: ["examples"] });
    expect((await prefs.getLearning(ctx(b))).goals).toBe("");
    expect((await prefs.getLearning(ctx(a))).goals).toBe("alice goals");
    const rows = await h.pool.query("select user_id, goals from learning_preferences");
    expect(rows.rows).toHaveLength(1);
  });

  it("validates preference input and rejects unknown fields", async () => {
    await expect(prefs.updateApp(ctx(a), { theme: "neon" })).rejects.toThrow();
    await expect(prefs.updateApp(ctx(a), { userId: b, theme: "dark" })).rejects.toThrow(); // cannot smuggle another user id
    await expect(prefs.updateLearning(ctx(a), { goals: "x".repeat(301) })).rejects.toThrow();
    expect((await prefs.getApp(ctx(b))).theme).toBe("light");
  });

  it("ignores any attempt to act as a user that is not the authenticated context", async () => {
    // The repository takes the user only from the context; there is no parameter for a second user id.
    const result = await prefRepo.upsertApp(ctx(a), { theme: "light" });
    expect(result.theme).toBe("light");
    expect((await prefs.getApp(ctx(b))).theme).toBe("light");
    const rows = await h.pool.query("select user_id, theme from app_preferences order by theme, user_id");
    expect(rows.rowCount).toBe(2);
  });

  it("rejects malformed or missing user context", async () => {
    await expect(users.getProfile({ requestId: "r", userId: "not-a-uuid" })).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(prefs.getApp({ requestId: "r", userId: "" })).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(sessionRepo.listActiveForUser({ requestId: "r", userId: "1 or 1=1" }, new Date())).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("lists only the caller's sessions", async () => {
    await sessions.create({ userId: a });
    await sessions.create({ userId: a });
    await sessions.create({ userId: b });
    expect(await sessions.list(ctx(a))).toHaveLength(2);
    expect(await sessions.list(ctx(b))).toHaveLength(1);
    expect((await sessions.list(ctx(b)))[0].userId).toBe(b);
  });

  it("cannot revoke another user's session, and that session keeps working", async () => {
    const bobs = await sessions.create({ userId: b });
    expect(await sessions.revoke(ctx(a), bobs.sessionId)).toBe(false);
    expect(await sessions.validate(bobs.token)).toMatchObject({ userId: b });
    expect(await sessions.revoke(ctx(b), bobs.sessionId)).toBe(true);
    expect(await sessions.validate(bobs.token)).toBeNull();
  });

  it("revokeAll only affects the caller's sessions", async () => {
    const bobs = await sessions.create({ userId: b });
    const alices = await sessions.create({ userId: a });
    expect(await sessions.revokeAll(ctx(a))).toBeGreaterThanOrEqual(1);
    expect(await sessions.validate(alices.token)).toBeNull();
    expect(await sessions.validate(bobs.token)).toMatchObject({ userId: b });
  });

  it("a session token resolves to its own user only", async () => {
    const s = await sessions.create({ userId: a });
    expect((await sessions.validate(s.token))?.userId).toBe(a);
    expect((await sessions.validate(s.token))?.userId).not.toBe(b);
  });
});
