import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiGateway, FakeAiProvider, fakeEmbedding, isFallbackEligible, isRetryable, type AiUsageRecord } from "../../src/server/providers/ai";
import { AI_TASKS } from "../../src/server/providers/ai/types";

function setup(opts: { dataMode?: "synthetic" | "real"; secondaryEnabled?: boolean; primary?: boolean } = {}) {
  const primary = new FakeAiProvider({ name: "primary-fake" });
  const secondary = new FakeAiProvider({ name: "secondary-fake" });
  const usage: AiUsageRecord[] = [];
  const sleeps: number[] = [];
  let t = 1_000_000;
  const gateway = new AiGateway({
    primary: opts.primary === false ? undefined : primary,
    secondary,
    dataMode: opts.dataMode ?? "synthetic",
    secondaryEnabled: opts.secondaryEnabled ?? true,
    maxRetries: 2,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    backoffMs: (attempt, retryAfter) => Math.max(retryAfter ?? 0, 10 * (attempt + 1)),
    now: () => t,
    onUsage: (u) => usage.push(u),
  });
  return { gateway, primary, secondary, usage, sleeps, advance: (ms: number) => (t += ms) };
}
const req = (task: keyof typeof AI_TASKS = "concept_extraction", extra: object = {}) => ({ task, dataSource: "synthetic" as const, prompt: "Summarise this synthetic text.", ...extra });

describe("data-mode guard (DR-18)", () => {
  it("refuses learner-derived tasks and sources in synthetic mode", async () => {
    const { gateway, primary } = setup();
    await expect(gateway.generateText(req("tutor_reply"))).rejects.toMatchObject({ code: "forbidden" });
    await expect(gateway.generateText({ ...req("concept_extraction"), dataSource: "learner" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(gateway.embed({ task: "tutor_query_embedding", dataSource: "synthetic", inputs: ["q"], dimensions: 8 })).rejects.toMatchObject({ code: "forbidden" });
    expect(primary.calls).toHaveLength(0);
  });

  it("allows synthetic non-learner tasks", async () => {
    const { gateway } = setup();
    expect((await gateway.generateText(req())).text).toContain("primary-fake");
  });

  it("allows learner data only in real mode", async () => {
    const { gateway } = setup({ dataMode: "real" });
    expect((await gateway.generateText({ ...req("tutor_reply"), dataSource: "learner" })).text).toContain("primary-fake");
  });

  it("rejects unknown tasks", async () => {
    const { gateway } = setup();
    await expect(gateway.generateText({ task: "not_a_task" as never, dataSource: "synthetic", prompt: "x" })).rejects.toMatchObject({ code: "validation_failed" });
  });
});

describe("failure classification helpers", () => {
  it("retry and fallback sets match the approved table", () => {
    for (const k of ["rate_limit", "unavailable", "timeout"] as const) expect(isRetryable(k)).toBe(true);
    for (const k of ["quota_exhausted", "invalid_request", "auth", "permission", "safety", "unknown"] as const) expect(isRetryable(k)).toBe(false);
    for (const k of ["rate_limit", "quota_exhausted", "unavailable", "timeout"] as const) expect(isFallbackEligible(k)).toBe(true);
    for (const k of ["invalid_request", "auth", "permission", "safety", "unknown"] as const) expect(isFallbackEligible(k)).toBe(false);
  });
});

describe("primary first, secondary only as an eligible fallback", () => {
  it("uses only the primary when it succeeds", async () => {
    const { gateway, secondary, usage } = setup();
    await gateway.generateText(req());
    expect(secondary.calls).toHaveLength(0);
    expect(usage.map((u) => [u.slot, u.outcome, u.fallback])).toEqual([["primary", "ok", false]]);
  });

  it("retries transient failures on the primary with backoff and does not fall back if a retry succeeds", async () => {
    const { gateway, primary, secondary, sleeps } = setup();
    primary.failNext("rate_limit", 1, 500);
    const res = await gateway.generateText(req());
    expect(res.text).toContain("primary-fake");
    expect(primary.calls).toHaveLength(2);
    expect(secondary.calls).toHaveLength(0);
    expect(sleeps).toEqual([500]);
  });

  it("falls back once after bounded retries are exhausted (unavailable)", async () => {
    const { gateway, primary, secondary, usage, sleeps } = setup();
    primary.failNext("unavailable", 3);
    const res = await gateway.generateText(req());
    expect(res.text).toContain("secondary-fake");
    expect(primary.calls).toHaveLength(3); // 1 try + 2 retries
    expect(secondary.calls).toHaveLength(1);
    expect(sleeps).toHaveLength(2);
    const last = usage[usage.length - 1];
    expect(last).toMatchObject({ slot: "secondary", fallback: true, outcome: "ok" });
  });

  it("falls back immediately on quota exhaustion and skips the primary while its breaker is open", async () => {
    const { gateway, primary, secondary, advance } = setup();
    primary.failNext("quota_exhausted");
    expect((await gateway.generateText(req())).text).toContain("secondary-fake");
    expect(primary.calls).toHaveLength(1); // no retries on quota exhaustion
    expect((await gateway.generateText(req())).text).toContain("secondary-fake");
    expect(primary.calls).toHaveLength(1); // breaker open: primary not tried again
    expect(secondary.calls).toHaveLength(2);
    advance(3_700_000); // cooldown over
    expect((await gateway.generateText(req())).text).toContain("primary-fake");
    expect(primary.calls).toHaveLength(2);
  });

  it.each(["invalid_request", "safety"] as const)("does not fall back on %s", async (kind) => {
    const { gateway, primary, secondary } = setup();
    primary.failNext(kind);
    await expect(gateway.generateText(req())).rejects.toMatchObject({ code: "processing_failed" });
    expect(secondary.calls).toHaveLength(0);
    expect(primary.calls).toHaveLength(1);
  });

  it.each(["auth", "permission"] as const)("does not fall back on %s, now or while the primary stays unhealthy", async (kind) => {
    const { gateway, primary, secondary } = setup();
    primary.failNext(kind);
    await expect(gateway.generateText(req())).rejects.toMatchObject({ code: "ai_unavailable" });
    await expect(gateway.generateText(req())).rejects.toMatchObject({ code: "ai_unavailable" });
    expect(secondary.calls).toHaveLength(0);
    expect(primary.calls).toHaveLength(1); // breaker open, primary not hammered
  });

  it("never uses the secondary for tasks that are not secondary-eligible", async () => {
    const { gateway, primary, secondary } = setup({ dataMode: "real" });
    primary.failNext("unavailable", 3);
    await expect(gateway.generateText({ ...req("tutor_reply"), dataSource: "learner" })).rejects.toMatchObject({ code: "ai_unavailable" });
    expect(secondary.calls).toHaveLength(0);
  });

  it("never uses the secondary when it is disabled", async () => {
    const { gateway, primary, secondary } = setup({ secondaryEnabled: false });
    primary.failNext("unavailable", 3);
    await expect(gateway.generateText(req())).rejects.toMatchObject({ code: "ai_unavailable" });
    expect(secondary.calls).toHaveLength(0);
    expect(gateway.secondaryState).toBe("disabled");
  });

  it("never uses the secondary on its own when there is no primary", async () => {
    const { gateway, secondary } = setup({ primary: false });
    await expect(gateway.generateText(req())).rejects.toMatchObject({ code: "ai_unavailable" });
    expect(secondary.calls).toHaveLength(0);
  });

  it("auto-disables the secondary after an authorization failure and stops using it", async () => {
    const { gateway, primary, secondary } = setup();
    primary.failNext("unavailable", 6);
    secondary.failNext("auth");
    await expect(gateway.generateText(req())).rejects.toMatchObject({ code: "ai_unavailable" });
    expect(gateway.secondaryState).toBe("auto_disabled");
    await expect(gateway.generateText(req())).rejects.toMatchObject({ code: "ai_unavailable" });
    expect(secondary.calls).toHaveLength(1); // not tried again
  });

  it("applies the same rules to embeddings", async () => {
    const { gateway, primary, secondary } = setup();
    primary.failNext("unavailable", 3);
    const r = await gateway.embed({ task: "chunk_embedding", dataSource: "synthetic", inputs: ["a", "b"], dimensions: 16 });
    expect(r.vectors).toHaveLength(2);
    expect(r.vectors[0]).toHaveLength(16);
    expect(secondary.calls).toHaveLength(1);
  });
});

describe("structured output is validated, never trusted", () => {
  const schema = z.object({ concepts: z.array(z.string()).min(1) });
  const withResponder = (responses: string[]) => {
    const s = setup();
    let i = 0;
    const p = new FakeAiProvider({ name: "primary-fake", responder: () => responses[Math.min(i++, responses.length - 1)] });
    const gateway = new AiGateway({ primary: p, dataMode: "synthetic", secondaryEnabled: false, sleep: async () => undefined });
    return { gateway, p, s };
  };

  it("returns parsed data when valid", async () => {
    const { gateway } = withResponder([JSON.stringify({ concepts: ["a"] })]);
    expect(await gateway.generateStructured({ ...req(), schema })).toEqual({ concepts: ["a"] });
  });

  it("makes one repair attempt after invalid output", async () => {
    const { gateway, p } = withResponder(["not json", JSON.stringify({ concepts: ["ok"] })]);
    expect(await gateway.generateStructured({ ...req(), schema })).toEqual({ concepts: ["ok"] });
    expect(p.calls).toHaveLength(2);
  });

  it("fails after the repair attempt and never returns unvalidated data", async () => {
    const { gateway, p } = withResponder([JSON.stringify({ concepts: [] }), JSON.stringify({ wrong: 1 })]);
    await expect(gateway.generateStructured({ ...req(), schema })).rejects.toMatchObject({ code: "processing_failed" });
    expect(p.calls).toHaveLength(2);
  });
});

describe("usage records", () => {
  it("never contain prompts, document text or keys", async () => {
    const { gateway, usage } = setup();
    await gateway.generateText({ ...req(), prompt: "TOP-SECRET-PROMPT-CONTENT AIza12345678901234567890ABCD" });
    const text = JSON.stringify(usage);
    expect(text).not.toContain("TOP-SECRET");
    expect(text).not.toContain("AIza");
    expect(Object.keys(usage[0]).sort()).toEqual(["attempt", "fallback", "latencyMs", "outcome", "provider", "slot", "task", "tokensIn", "tokensOut"].sort());
  });
});

describe("fake embeddings", () => {
  it("are deterministic unit vectors of the requested size", () => {
    const a = fakeEmbedding("hello", 768);
    expect(a).toHaveLength(768);
    expect(fakeEmbedding("hello", 768)).toEqual(a);
    expect(fakeEmbedding("world", 768)).not.toEqual(a);
    expect(Math.sqrt(a.reduce((s, v) => s + v * v, 0))).toBeCloseTo(1, 6);
  });
});
