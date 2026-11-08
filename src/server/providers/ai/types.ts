import type { ZodType } from "zod";

/**
 * Registry of AI tasks. Unknown tasks are rejected.
 * secondaryEligible: may use the secondary (third-party-owned) credential (owner decision S1: non-personal tasks only).
 * learnerContent: the prompt is built from learner behaviour or learner-written text (never allowed in synthetic mode).
 */
export const AI_TASKS = {
  concept_extraction: { secondaryEligible: true, learnerContent: false },
  graph_proposal: { secondaryEligible: true, learnerContent: false },
  chunk_embedding: { secondaryEligible: true, learnerContent: false },
  question_generation_from_material: { secondaryEligible: true, learnerContent: false },
  tutor_reply: { secondaryEligible: false, learnerContent: true },
  tutor_query_embedding: { secondaryEligible: false, learnerContent: true },
  short_answer_grading: { secondaryEligible: false, learnerContent: true },
  feedback_generation: { secondaryEligible: false, learnerContent: true },
  recommendation_explanation: { secondaryEligible: false, learnerContent: true },
  misconception_inference: { secondaryEligible: false, learnerContent: true },
} as const;

export type AiTask = keyof typeof AI_TASKS;

/** "synthetic": fixtures or generated test content. "learner": derived from real learner data or real uploads. */
export type DataSource = "synthetic" | "learner";

export type GenerateRequest = {
  task: AiTask;
  dataSource: DataSource;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
  /** Ask the provider for JSON output (it is still validated by the gateway). */
  json?: boolean;
  signal?: AbortSignal;
};
export type GenerateResult = { text: string; model: string; tokensIn?: number; tokensOut?: number };

export type StructuredRequest<T> = Omit<GenerateRequest, "json"> & { schema: ZodType<T> };

export type EmbedRequest = { task: AiTask; dataSource: DataSource; inputs: string[]; dimensions: number; signal?: AbortSignal };
export type EmbedResult = { vectors: number[][]; model: string; dimensions: number; tokensIn?: number };

/** Vendor-neutral provider contract. Gemini (or any other vendor) is an adapter implementing it. */
export interface AiProvider {
  readonly name: string;
  generateText(req: GenerateRequest): Promise<GenerateResult>;
  embed(req: EmbedRequest): Promise<EmbedResult>;
}

export type AiFailureKind =
  | "rate_limit" // per-minute limit (HTTP 429)
  | "quota_exhausted" // daily quota or spend limit
  | "unavailable" // 503 and friends
  | "timeout"
  | "invalid_request"
  | "auth"
  | "permission"
  | "safety"
  | "unknown";

/** Adapters translate vendor errors into this, so fallback rules never depend on a vendor. */
export class AiProviderError extends Error {
  readonly kind: AiFailureKind;
  readonly retryAfterMs?: number;
  constructor(kind: AiFailureKind, message: string, options?: { retryAfterMs?: number; cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AiProviderError";
    this.kind = kind;
    this.retryAfterMs = options?.retryAfterMs;
  }
}

export type AiUsageRecord = Readonly<{
  task: AiTask;
  slot: "primary" | "secondary";
  provider: string;
  attempt: number;
  fallback: boolean;
  outcome: "ok" | AiFailureKind;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
}>;
