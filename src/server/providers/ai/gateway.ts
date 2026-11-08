import { z } from "zod";
import { AppError } from "../../platform/errors";
import type { Logger } from "../../platform/logger";
import { CircuitBreaker, type BreakerOptions } from "./circuit-breaker";
import {
  AI_TASKS,
  AiProviderError,
  type AiFailureKind,
  type AiProvider,
  type AiTask,
  type AiUsageRecord,
  type EmbedRequest,
  type EmbedResult,
  type GenerateRequest,
  type GenerateResult,
  type StructuredRequest,
} from "./types";

export type GatewayOptions = {
  primary?: AiProvider;
  secondary?: AiProvider;
  /** Synthetic mode refuses learner-derived prompts (DR-18 technical guard). */
  dataMode: "synthetic" | "real";
  secondaryEnabled: boolean;
  maxRetries?: number;
  backoffMs?: (attempt: number, retryAfterMs?: number) => number;
  sleep?: (ms: number) => Promise<void>;
  breaker?: Partial<BreakerOptions>;
  now?: () => number;
  logger?: Logger;
  onUsage?: (u: AiUsageRecord) => void;
};

const RETRYABLE: ReadonlySet<AiFailureKind> = new Set(["rate_limit", "unavailable", "timeout"]);
/** Failures that justify trying the secondary credential. Never invalid requests, auth, permission or safety. */
const FALLBACK_ELIGIBLE: ReadonlySet<AiFailureKind> = new Set(["rate_limit", "quota_exhausted", "unavailable", "timeout"]);

export const isRetryable = (k: AiFailureKind) => RETRYABLE.has(k);
export const isFallbackEligible = (k: AiFailureKind) => FALLBACK_ELIGIBLE.has(k);

/**
 * The only entry point application services use for AI. It owns: the data-mode guard, task eligibility,
 * bounded retries, the primary-then-secondary rule, circuit breaking, and usage records (never prompts or keys).
 */
export class AiGateway {
  private readonly breakers: Record<"primary" | "secondary", CircuitBreaker>;
  private secondaryAutoDisabled = false;
  private readonly maxRetries: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly backoff: (attempt: number, retryAfterMs?: number) => number;

  constructor(private readonly o: GatewayOptions) {
    const now = o.now ?? Date.now;
    const b: BreakerOptions = { failureThreshold: 3, cooldownMs: 60_000, quotaCooldownMs: 3_600_000, ...o.breaker };
    this.breakers = { primary: new CircuitBreaker(b, now), secondary: new CircuitBreaker(b, now) };
    this.maxRetries = o.maxRetries ?? 2;
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.backoff = o.backoffMs ?? ((attempt, retryAfter) => Math.max(retryAfter ?? 0, Math.min(8_000, 500 * 2 ** attempt)) + Math.floor(Math.random() * 250));
  }

  get secondaryState(): "disabled" | "auto_disabled" | "enabled" {
    if (!this.o.secondaryEnabled || !this.o.secondary) return "disabled";
    return this.secondaryAutoDisabled ? "auto_disabled" : "enabled";
  }

  async generateText(req: GenerateRequest): Promise<GenerateResult> {
    this.guard(req.task, req.dataSource);
    return this.run(req.task, (p) => p.generateText(req));
  }

  async embed(req: EmbedRequest): Promise<EmbedResult> {
    this.guard(req.task, req.dataSource);
    return this.run(req.task, (p) => p.embed(req));
  }

  /** Validates output with Zod; one repair attempt at most, never trusts unvalidated JSON. */
  async generateStructured<T>(req: StructuredRequest<T>): Promise<T> {
    const { schema, ...base } = req;
    const attempt = async (hint?: string) => {
      const res = await this.generateText({ ...base, json: true, prompt: hint ? `${base.prompt}\n\n${hint}` : base.prompt });
      let json: unknown;
      try {
        json = JSON.parse(res.text);
      } catch {
        return { ok: false as const, hint: "Your previous reply was not valid JSON. Reply with JSON only." };
      }
      const parsed = schema.safeParse(json);
      if (parsed.success) return { ok: true as const, value: parsed.data };
      return { ok: false as const, hint: `Your previous reply did not match the required schema (${z.prettifyError(parsed.error).slice(0, 300)}). Reply with corrected JSON only.` };
    };
    const first = await attempt();
    if (first.ok) return first.value;
    const second = await attempt(first.hint);
    if (second.ok) return second.value;
    throw new AppError("processing_failed", "The AI response could not be validated.");
  }

  private guard(task: AiTask, dataSource: GenerateRequest["dataSource"]): void {
    const def = (AI_TASKS as Record<string, { learnerContent: boolean } | undefined>)[task];
    if (!def) throw new AppError("validation_failed", "Unknown AI task.");
    const learnerDerived = dataSource === "learner" || def.learnerContent;
    if (learnerDerived && this.o.dataMode !== "real") {
      throw new AppError("forbidden", "Learner data cannot be sent to an AI provider in synthetic mode.");
    }
  }

  private async run<T extends { tokensIn?: number; tokensOut?: number }>(task: AiTask, op: (p: AiProvider) => Promise<T>): Promise<T> {
    const o = this.o;
    const secondaryEligible = AI_TASKS[task].secondaryEligible;
    let lastKind: AiFailureKind = "unavailable";
    let primaryTried = false;

    if (o.primary && this.breakers.primary.isOpen()) {
      // Skipped by the breaker: fall back only if it opened for an eligible reason (never auth/permission).
      primaryTried = true;
      lastKind = this.breakers.primary.openReason ?? "unavailable";
    } else if (o.primary) {
      primaryTried = true;
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        const started = Date.now();
        try {
          const res = await op(o.primary);
          this.breakers.primary.recordSuccess();
          this.usage({ task, slot: "primary", provider: o.primary.name, attempt, fallback: false, outcome: "ok", started, res });
          return res;
        } catch (err) {
          const kind = classify(err);
          const retryAfter = err instanceof AiProviderError ? err.retryAfterMs : undefined;
          lastKind = kind;
          this.breakers.primary.recordFailure(kind, retryAfter);
          this.usage({ task, slot: "primary", provider: o.primary.name, attempt, fallback: false, outcome: kind, started });
          if (!isFallbackEligible(kind)) throw this.terminal(kind);
          if (isRetryable(kind) && attempt < this.maxRetries && !this.breakers.primary.isOpen()) {
            await this.sleep(this.backoff(attempt, retryAfter));
            continue;
          }
          break;
        }
      }
    }

    // Secondary: only when enabled, authorized for this task, healthy, and the primary failed eligibly (or is open).
    // Without a primary attempt (no primary configured) the secondary is never used: it is a fallback only.
    const mayFallback = primaryTried && isFallbackEligible(lastKind);
    if (mayFallback && o.secondaryEnabled && o.secondary && !this.secondaryAutoDisabled && secondaryEligible && !this.breakers.secondary.isOpen()) {
      const started = Date.now();
      try {
        const res = await op(o.secondary);
        this.breakers.secondary.recordSuccess();
        this.usage({ task, slot: "secondary", provider: o.secondary.name, attempt: 0, fallback: true, outcome: "ok", started, res });
        return res;
      } catch (err) {
        const kind = classify(err);
        this.breakers.secondary.recordFailure(kind);
        this.usage({ task, slot: "secondary", provider: o.secondary.name, attempt: 0, fallback: true, outcome: kind, started });
        if (kind === "auth" || kind === "permission") {
          this.secondaryAutoDisabled = true;
          o.logger?.error("secondary AI credential disabled after an authorization failure", { kind });
        }
        lastKind = kind;
      }
    }
    throw this.terminal(lastKind);
  }

  private terminal(kind: AiFailureKind): AppError {
    if (kind === "invalid_request" || kind === "safety") {
      return new AppError("processing_failed", "The AI provider could not process this request.");
    }
    return new AppError("ai_unavailable", "The AI service is temporarily unavailable. Reading and objective grading still work.");
  }

  private usage(u: { task: AiTask; slot: "primary" | "secondary"; provider: string; attempt: number; fallback: boolean; outcome: AiUsageRecord["outcome"]; started: number; res?: { tokensIn?: number; tokensOut?: number } }): void {
    const record: AiUsageRecord = {
      task: u.task,
      slot: u.slot,
      provider: u.provider,
      attempt: u.attempt,
      fallback: u.fallback,
      outcome: u.outcome,
      latencyMs: Date.now() - u.started,
      tokensIn: u.res?.tokensIn,
      tokensOut: u.res?.tokensOut,
    };
    this.o.onUsage?.(record);
    this.o.logger?.info("ai call", { task: record.task, slot: record.slot, fallback: record.fallback, outcome: record.outcome, attempt: record.attempt, ms: record.latencyMs });
  }
}

function classify(err: unknown): AiFailureKind {
  if (err instanceof AiProviderError) return err.kind;
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  return "unknown";
}
