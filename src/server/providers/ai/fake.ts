import { createHash } from "node:crypto";
import {
  AiProviderError,
  type AiFailureKind,
  type AiProvider,
  type EmbedRequest,
  type EmbedResult,
  type GenerateRequest,
  type GenerateResult,
} from "./types";

/** Deterministic unit vector from text (no network, no vendor). */
export function fakeEmbedding(text: string, dimensions: number): number[] {
  const out = new Array<number>(dimensions);
  let counter = 0;
  let block = createHash("sha256").update(`${text}:${counter}`).digest();
  let pos = 0;
  for (let i = 0; i < dimensions; i++) {
    if (pos + 4 > block.length) {
      counter += 1;
      block = createHash("sha256").update(`${text}:${counter}`).digest();
      pos = 0;
    }
    out[i] = block.readInt32BE(pos) / 2 ** 31;
    pos += 4;
  }
  const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0)) || 1;
  return out.map((v) => v / norm);
}

export type FakeAiOptions = { name?: string; model?: string; responder?: (req: GenerateRequest) => string };

/** Test double: records calls, can be told to fail with a given failure kind. */
export class FakeAiProvider implements AiProvider {
  readonly name: string;
  readonly calls: Array<{ kind: "generate" | "embed"; task: string }> = [];
  private failures: Array<{ kind: AiFailureKind; retryAfterMs?: number }> = [];
  constructor(private readonly options: FakeAiOptions = {}) {
    this.name = options.name ?? "fake";
  }

  failNext(kind: AiFailureKind, times = 1, retryAfterMs?: number): this {
    for (let i = 0; i < times; i++) this.failures.push({ kind, retryAfterMs });
    return this;
  }

  private maybeFail(): void {
    const f = this.failures.shift();
    if (f) throw new AiProviderError(f.kind, `fake ${f.kind}`, { retryAfterMs: f.retryAfterMs });
  }

  async generateText(req: GenerateRequest): Promise<GenerateResult> {
    this.calls.push({ kind: "generate", task: req.task });
    this.maybeFail();
    const text = this.options.responder ? this.options.responder(req) : `[fake:${this.name}] ${req.task}`;
    return { text, model: this.options.model ?? "fake-model", tokensIn: req.prompt.length, tokensOut: text.length };
  }

  async embed(req: EmbedRequest): Promise<EmbedResult> {
    this.calls.push({ kind: "embed", task: req.task });
    this.maybeFail();
    return { vectors: req.inputs.map((t) => fakeEmbedding(t, req.dimensions)), model: this.options.model ?? "fake-embedding", dimensions: req.dimensions };
  }
}
