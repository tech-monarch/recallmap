import { describe, expect, it } from "vitest";
import { DEMO_LEARNER_DATA, EMPTY_LEARNER_DATA } from "@/lib/recallmap/demo-history";
import {
  attemptsFor, completedRetentionChecks, conceptProgress, hasAnyEvidence, improvedConcepts, recommendedActivities,
  subjectProgress, trendFor, trendsOverTime, uncertainConcepts,
} from "@/lib/recallmap/progress";
import type { AssessmentAttempt, LearnerData } from "@/lib/recallmap/types";

const D = DEMO_LEARNER_DATA;
const att = (id: string, conceptId: string, sequence: number, correct: number, total: number, kind: AssessmentAttempt["kind"] = "assessment"): AssessmentAttempt =>
  ({ id, conceptId, activityId: "x", kind, sequence, correct, total });
const withAttempts = (attempts: AssessmentAttempt[]): LearnerData => ({ ...D, attempts });

describe("subject progress", () => {
  it("counts states per subject and never treats unassessed as weak", () => {
    const p = subjectProgress(D, "programming");
    expect(p.total).toBe(7);
    expect(p.counts).toEqual({ demonstrated: 1, partial: 2, "suspected-gap": 1, "not-assessed": 3 });
    expect(p.assessed).toBe(4);
    expect(p.counts["suspected-gap"]).toBe(1); // loops/functions/recursion are NOT gaps
  });
  it("groups concepts by topic", () => {
    expect(subjectProgress(D, "mathematics").topics.map((t) => t.topic)).toEqual(["Foundations", "Equations", "Functions"]);
  });
  it("returns zeros for a subject with no concept map", () => {
    const p = subjectProgress(D, "databases");
    expect(p.total).toBe(0);
    expect(p.assessed).toBe(0);
    expect(p.topics).toEqual([]);
  });
});

describe("basis of evidence", () => {
  it("is measured only when scored attempts exist", () => {
    const c = D.concepts.find((x) => x.id === "variables")!;
    const cp = conceptProgress(D, c);
    expect(cp.basis).toBe("measured");
    expect([cp.correct, cp.questions]).toEqual([3, 3]);
  });
  it("is 'none' for unassessed concepts and 'estimated' for a state with no scored attempt behind it", () => {
    const loops = D.concepts.find((x) => x.id === "loops")!;
    expect(conceptProgress(D, loops).basis).toBe("none");
    const estimated = conceptProgress(withAttempts([]), D.concepts.find((x) => x.id === "variables")!);
    expect(estimated.basis).toBe("estimated");
  });
  it("ignores attempts with zero questions", () => {
    expect(attemptsFor(withAttempts([att("z", "variables", 1, 0, 0)]), "variables")).toEqual([]);
  });
});

describe("trends over time", () => {
  it("one attempt is never a trend", () => {
    expect(trendFor(D, "conditions").kind).toBe("single");
    expect(trendFor(D, "loops").kind).toBe("no-data");
  });
  it("detects improvement, decline and no meaningful change from first vs latest", () => {
    expect(trendFor(withAttempts([att("a", "lists", 1, 1, 4), att("b", "lists", 2, 3, 4)]), "lists").kind).toBe("improved");
    expect(trendFor(withAttempts([att("a", "lists", 1, 3, 4), att("b", "lists", 2, 1, 4)]), "lists").kind).toBe("declined");
    expect(trendFor(withAttempts([att("a", "lists", 1, 2, 4), att("b", "lists", 2, 2, 4)]), "lists").kind).toBe("unchanged");
  });
  it("orders by sequence, not by array order", () => {
    const t = trendFor(withAttempts([att("late", "lists", 5, 4, 4), att("early", "lists", 1, 0, 4)]), "lists");
    expect(t.kind).toBe("improved");
  });
  it("demo data: only concepts with 2+ attempts show change; single-attempt concepts are counted separately", () => {
    const { changes, singleAttempt } = trendsOverTime(D);
    expect(changes.map((c) => [c.concept.id, c.trend.kind])).toEqual([["booleans", "improved"], ["arithmetic", "unchanged"]]);
    expect(singleAttempt).toBeGreaterThan(0);
  });
  it("reports nothing with no evidence", () => {
    expect(trendsOverTime(EMPTY_LEARNER_DATA)).toEqual({ changes: [], singleAttempt: 0 });
  });
});

describe("previously weak, now improved", () => {
  it("includes Booleans (25% → 50%) from the demo log", () => {
    expect(improvedConcepts(D).map((c) => c.concept.id)).toEqual(["booleans"]);
  });
  it("excludes improvement that did not start from a weak result", () => {
    expect(improvedConcepts(withAttempts([att("a", "lists", 1, 3, 5), att("b", "lists", 2, 5, 5)]))).toEqual([]);
  });
  it("is empty without enough history", () => {
    expect(improvedConcepts(EMPTY_LEARNER_DATA)).toEqual([]);
  });
});

describe("uncertainty", () => {
  const byId = (id: string) => uncertainConcepts(D).find((u) => u.concept.id === id);
  it("flags unassessed concepts as missing data", () => expect(byId("loops")?.reasons).toContain("not-assessed"));
  it("flags tentative results with few scored questions", () => expect(byId("lists")?.reasons).toContain("limited-evidence"));
  it("flags unconfirmed inferences", () => expect(byId("conditions")?.reasons).toContain("unconfirmed-inference"));
  it("does not flag well-evidenced demonstrated concepts", () => expect(byId("variables")).toBeUndefined());
});

describe("retention and recommendations", () => {
  it("lists only completed retention checks as retention results", () => {
    const r = completedRetentionChecks(D);
    expect(r).toHaveLength(1);
    expect(r[0].concept.id).toBe("arithmetic");
  });
  it("recommends retention checks only for demonstrated concepts that were never re-checked", () => {
    const ids = recommendedActivities(D).filter((a) => a.type === "retention-check").flatMap((a) => a.conceptIds);
    expect(ids.sort()).toEqual(["expressions", "variables"]);
  });
  it("recommends reassessment for gaps and partial concepts, and first checks only when prerequisites are demonstrated", () => {
    const rec = recommendedActivities(D);
    const types = (id: string) => rec.filter((a) => a.conceptIds.includes(id)).map((a) => a.type);
    expect(types("conditions")).toEqual(["follow-up-assessment"]);
    expect(types("function-notation")).toEqual(["assessment"]);
    expect(types("loops")).toEqual([]); // prerequisite Conditions is a suspected gap
    expect(types("quadratics")).toEqual([]);
  });
  it("marks every recommendation as recommended with a reason and no completion sequence", () => {
    for (const a of recommendedActivities(D)) {
      expect(a.status).toBe("recommended");
      expect(a.reason).toBeTruthy();
      expect(a.sequence).toBeUndefined();
    }
  });
  it("recommends nothing when there is no concept map", () => expect(recommendedActivities(EMPTY_LEARNER_DATA)).toEqual([]));
});

describe("missing evidence is handled honestly", () => {
  it("empty data has no evidence", () => expect(hasAnyEvidence(EMPTY_LEARNER_DATA)).toBe(false));
  it("a concept map with nothing assessed has no evidence and recommends only first checks", () => {
    const fresh: LearnerData = { ...D, states: [], attempts: [], activities: [] };
    expect(hasAnyEvidence(fresh)).toBe(false);
    expect(subjectProgress(fresh, "programming").assessed).toBe(0);
    expect(recommendedActivities(fresh).every((a) => a.type === "assessment")).toBe(true);
    expect(completedRetentionChecks(fresh)).toEqual([]);
  });
  it("demo attempts are consistent with demo learner states", () => {
    for (const a of D.attempts) expect(D.states.find((s) => s.conceptId === a.conceptId)?.state).not.toBe("not-assessed");
    for (const a of D.attempts) expect(a.correct).toBeLessThanOrEqual(a.total);
  });
});
