import type { AiFailureKind } from "./types";

export type BreakerOptions = { failureThreshold: number; cooldownMs: number; quotaCooldownMs: number };

/** Per-credential-slot breaker. Time is injected so behaviour is testable. */
export class CircuitBreaker {
  private consecutive = 0;
  private openUntil = 0;
  private reason: AiFailureKind | null = null;
  constructor(
    private readonly options: BreakerOptions,
    private readonly now: () => number = Date.now,
  ) {}

  isOpen(): boolean {
    return this.now() < this.openUntil;
  }

  recordSuccess(): void {
    this.consecutive = 0;
    this.openUntil = 0;
    this.reason = null;
  }

  recordFailure(kind: AiFailureKind, retryAfterMs?: number): void {
    if (kind === "quota_exhausted") {
      this.openUntil = this.now() + Math.max(retryAfterMs ?? 0, this.options.quotaCooldownMs);
      this.reason = kind;
      return;
    }
    if (kind === "auth" || kind === "permission") {
      this.openUntil = this.now() + this.options.quotaCooldownMs;
      this.reason = kind;
      return;
    }
    this.consecutive += 1;
    if (this.consecutive >= this.options.failureThreshold) {
      this.openUntil = this.now() + Math.max(retryAfterMs ?? 0, this.options.cooldownMs);
      this.reason = kind;
    }
  }

  /** Why the breaker opened. The gateway uses it to decide whether falling back is allowed. */
  get openReason(): AiFailureKind | null {
    return this.isOpen() ? this.reason : null;
  }

  get openUntilMs(): number {
    return this.openUntil;
  }
}
