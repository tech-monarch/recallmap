import type { UserContext } from "../../platform/request-context";
import { generateSessionToken, hashIp, hashSessionToken, SESSION_TOKEN_PATTERN } from "./tokens";
import type { SessionRepository } from "./session-repository";

export type SessionPolicy = Readonly<{ absoluteTtlHours: number; idleTtlHours: number; secret?: string }>;
export type ValidSession = Readonly<{ userId: string; sessionId: string; expiresAt: Date }>;

const HOUR = 3_600_000;
const TOUCH_INTERVAL_MS = 60_000;

/**
 * Opaque server-side sessions: absolute and idle expiry, rotation, revocation.
 * The clock is injectable so expiry behaviour is testable without waiting.
 */
export class SessionService {
  constructor(
    private readonly repo: SessionRepository,
    private readonly policy: SessionPolicy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: { userId: string; userAgent?: string | null; ip?: string | null }): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
    const now = this.now();
    const token = generateSessionToken();
    const idHash = hashSessionToken(token);
    const expiresAt = new Date(now.getTime() + this.policy.absoluteTtlHours * HOUR);
    await this.repo.insert({
      idHash,
      userId: input.userId,
      expiresAt,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
      ipHash: input.ip ? hashIp(input.ip, this.policy.secret) : null,
      now,
    });
    return { token, sessionId: idHash, expiresAt };
  }

  /** Returns the session if the token is genuine, unrevoked, within both expiry limits, and the user is active. */
  async validate(token: string | null | undefined): Promise<ValidSession | null> {
    if (!token || !SESSION_TOKEN_PATTERN.test(token)) return null;
    const idHash = hashSessionToken(token);
    const found = await this.repo.findByHash(idHash);
    if (!found) return null;
    const { session, userStatus } = found;
    const now = this.now();
    if (session.revokedAt) return null;
    if (now.getTime() >= session.expiresAt.getTime()) return null;
    if (now.getTime() - session.lastSeenAt.getTime() >= this.policy.idleTtlHours * HOUR) return null;
    if (userStatus !== "active") return null;
    if (now.getTime() - session.lastSeenAt.getTime() >= TOUCH_INTERVAL_MS) await this.repo.touch(idHash, now);
    return { userId: session.userId, sessionId: idHash, expiresAt: session.expiresAt };
  }

  /** Issues a new token and revokes the old one. The absolute expiry is not extended by rotation. */
  async rotate(token: string, meta?: { userAgent?: string | null; ip?: string | null }): Promise<{ token: string; sessionId: string; expiresAt: Date } | null> {
    const current = await this.validate(token);
    if (!current) return null;
    const now = this.now();
    const next = generateSessionToken();
    const nextHash = hashSessionToken(next);
    const ok = await this.repo.rotate(hashSessionToken(token), {
      idHash: nextHash,
      userId: current.userId,
      expiresAt: current.expiresAt,
      userAgent: meta?.userAgent?.slice(0, 300) ?? null,
      ipHash: meta?.ip ? hashIp(meta.ip, this.policy.secret) : null,
      now,
    });
    return ok ? { token: next, sessionId: nextHash, expiresAt: current.expiresAt } : null;
  }

  list(ctx: UserContext) {
    return this.repo.listActiveForUser(ctx, this.now());
  }

  revoke(ctx: UserContext, sessionId: string): Promise<boolean> {
    return this.repo.revokeForUser(ctx, sessionId, this.now());
  }

  revokeAll(ctx: UserContext): Promise<number> {
    return this.repo.revokeAllForUser(ctx, this.now());
  }
}
