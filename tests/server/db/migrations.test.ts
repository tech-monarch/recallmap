import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DbHandle } from "../../../src/server/db/client";
import { runMigrations } from "../../../src/server/db/migrate";
import { hasDb, resetAndMigrate } from "./helpers";

describe.skipIf(!hasDb)("migrations and constraints (real PostgreSQL)", () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = await resetAndMigrate();
  });
  afterAll(async () => {
    await h?.close();
  });
  const q = (text: string, values: unknown[] = []) => h.pool.query(text, values);
  const expectPgError = async (p: Promise<unknown>, code: string) => {
    await expect(p).rejects.toMatchObject({ code });
  };

  it("applies on an empty database and creates the identity tables", async () => {
    const { rows } = await q("select table_name from information_schema.tables where table_schema='public' order by 1");
    expect(rows.map((r) => r.table_name)).toEqual(
      ["app_preferences", "auth_identities", "learning_preferences", "oauth_states", "sessions", "users", "worker_heartbeats"].sort(),
    );
  });

  it("is idempotent: running migrations again changes nothing and does not fail", async () => {
    await expect(runMigrations(h.db)).resolves.toBeUndefined();
  });

  it("does not require any extension", async () => {
    const { rows } = await q("select extname from pg_extension");
    expect(rows.map((r) => r.extname)).toEqual(["plpgsql"]);
  });

  it("enforces case-insensitive unique emails", async () => {
    await q("insert into users (email) values ('Ada@Example.com')");
    await expectPgError(q("insert into users (email) values ('ada@example.COM')"), "23505");
  });

  it("enforces check constraints", async () => {
    const { rows } = await q("insert into users (email) values ('check@example.com') returning id");
    const id = rows[0].id;
    await expectPgError(q("insert into users (email, status) values ('x@example.com','banned')"), "23514");
    await expectPgError(q("insert into app_preferences (user_id, theme) values ($1,'neon')", [id]), "23514");
    await expectPgError(q("insert into app_preferences (user_id, map_layout) values ($1,'circle')", [id]), "23514");
    await expectPgError(q("insert into learning_preferences (user_id, goals) values ($1, repeat('a', 301))", [id]), "23514");
    await expectPgError(q("insert into auth_identities (user_id, provider, provider_subject) values ($1,'github','1')", [id]), "23514");
  });

  it("enforces foreign keys and cascades user deletion through owned data", async () => {
    const { rows } = await q("insert into users (email) values ('cascade@example.com') returning id");
    const id = rows[0].id;
    await expectPgError(q("insert into sessions (id_hash, user_id, expires_at) values ('h0', gen_random_uuid(), now())"), "23503");
    await q("insert into sessions (id_hash, user_id, expires_at) values ('h1', $1, now() + interval '1 day')", [id]);
    await q("insert into app_preferences (user_id) values ($1)", [id]);
    await q("insert into learning_preferences (user_id) values ($1)", [id]);
    await q("insert into auth_identities (user_id, provider, provider_subject) values ($1,'google','sub-1')", [id]);
    await expectPgError(q("insert into auth_identities (user_id, provider, provider_subject) values ($1,'google','sub-1')", [id]), "23505");
    await q("delete from users where id=$1", [id]);
    for (const table of ["sessions", "app_preferences", "learning_preferences", "auth_identities"]) {
      const r = await q(`select count(*)::int n from ${table} where user_id=$1`, [id]);
      expect(r.rows[0].n, table).toBe(0);
    }
  });

  it("stores only hashes in sessions (the primary key is the hash column)", async () => {
    const { rows } = await q("select column_name from information_schema.columns where table_name='sessions' order by 1");
    const cols = rows.map((r) => r.column_name);
    expect(cols).toContain("id_hash");
    expect(cols).not.toContain("token");
    expect(cols).not.toContain("session_token");
  });
});
