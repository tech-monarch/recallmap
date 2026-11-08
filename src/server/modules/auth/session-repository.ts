import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "../../db/client";
import { sessions, users } from "../../db/schema";
import type { UserContext } from "../../platform/request-context";
import { requireUser } from "../shared";

export type SessionRow = typeof sessions.$inferSelect;
export type SessionLookup = Readonly<{ session: SessionRow; userStatus: string }>;
export type NewSession = Readonly<{ idHash: string; userId: string; expiresAt: Date; userAgent?: string | null; ipHash?: string | null; now: Date }>;

export class SessionRepository {
  constructor(private readonly db: Db) {}

  async insert(s: NewSession): Promise<void> {
    await this.db.insert(sessions).values({
      idHash: s.idHash,
      userId: s.userId,
      expiresAt: s.expiresAt,
      userAgent: s.userAgent ?? null,
      ipHash: s.ipHash ?? null,
      createdAt: s.now,
      lastSeenAt: s.now,
    });
  }

  /** Authentication lookup by token hash. This is the one non-user-scoped read: the caller has no identity yet. */
  async findByHash(idHash: string): Promise<SessionLookup | null> {
    const [row] = await this.db
      .select({ session: sessions, userStatus: users.status })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.idHash, idHash))
      .limit(1);
    return row ?? null;
  }

  async touch(idHash: string, now: Date): Promise<void> {
    await this.db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.idHash, idHash));
  }

  /** Rotation: insert the new session and revoke the old one atomically. */
  async rotate(oldHash: string, replacement: NewSession): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const revoked = await tx
        .update(sessions)
        .set({ revokedAt: replacement.now, replacedByIdHash: replacement.idHash })
        .where(and(eq(sessions.idHash, oldHash), isNull(sessions.revokedAt)))
        .returning({ id: sessions.idHash });
      if (revoked.length === 0) return false;
      await tx.insert(sessions).values({
        idHash: replacement.idHash,
        userId: replacement.userId,
        expiresAt: replacement.expiresAt,
        userAgent: replacement.userAgent ?? null,
        ipHash: replacement.ipHash ?? null,
        createdAt: replacement.now,
        lastSeenAt: replacement.now,
      });
      return true;
    });
  }

  async listActiveForUser(ctx: UserContext, now: Date): Promise<SessionRow[]> {
    const userId = requireUser(ctx);
    return this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)));
  }

  /** Scoped by user: a session id belonging to another user is simply not found. */
  async revokeForUser(ctx: UserContext, idHash: string, now: Date): Promise<boolean> {
    const userId = requireUser(ctx);
    const rows = await this.db
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.idHash, idHash), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.idHash });
    return rows.length > 0;
  }

  async revokeAllForUser(ctx: UserContext, now: Date): Promise<number> {
    const userId = requireUser(ctx);
    const rows = await this.db
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.idHash });
    return rows.length;
  }

  /** Housekeeping for a scheduled job (not user-scoped by nature). */
  async deleteExpiredBefore(cutoff: Date): Promise<number> {
    const rows = await this.db.delete(sessions).where(lt(sessions.expiresAt, cutoff)).returning({ id: sessions.idHash });
    return rows.length;
  }

  async countForUser(ctx: UserContext): Promise<number> {
    const userId = requireUser(ctx);
    const [r] = await this.db.select({ n: sql<number>`count(*)::int` }).from(sessions).where(eq(sessions.userId, userId));
    return r?.n ?? 0;
  }
}
