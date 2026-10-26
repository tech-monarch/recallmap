import { describe, expect, it } from "vitest";
import { DEMO_CONCEPTS, DEMO_LEARNER_STATES, DEMO_MAP_LAYOUT, DEMO_SUBJECTS } from "@/lib/recallmap/demo-data";
import { ancestorsOf, conceptsFor, dependentsOf, suggestNext, suspectedGaps } from "@/lib/recallmap/knowledge";

describe("knowledge model", () => {
  it("gives every demo subject its own map and keeps prerequisites inside the subject", () => {
    for (const s of DEMO_SUBJECTS) expect(conceptsFor(s.id).length).toBeGreaterThan(3);
    for (const c of DEMO_CONCEPTS) for (const p of c.prerequisites) expect(DEMO_CONCEPTS.find((x) => x.id === p)?.subjectId).toBe(c.subjectId);
  });
  it("has a layout position and exactly one learner state for every concept", () => {
    for (const c of DEMO_CONCEPTS) {
      expect(DEMO_MAP_LAYOUT[c.id]).toBeDefined();
      expect(DEMO_LEARNER_STATES.filter((s) => s.conceptId === c.id)).toHaveLength(1);
    }
  });
  it("has no prerequisite cycles", () => {
    for (const c of DEMO_CONCEPTS) expect(ancestorsOf(c.id).has(c.id)).toBe(false);
  });
  it("computes transitive prerequisites and dependents", () => {
    expect([...ancestorsOf("loops")].sort()).toEqual(["booleans", "conditions", "variables"]);
    expect(dependentsOf("conditions").map((c) => c.id).sort()).toEqual(["functions", "loops", "recursion"]);
  });
  it("only reports concepts with a suspected-gap state, never unassessed ones", () => {
    const ids = suspectedGaps().map((g) => g.concept.id).sort();
    expect(ids).toEqual(["conditions", "equations"]);
    for (const g of suspectedGaps()) expect(g.evidence.length).toBeGreaterThan(0);
  });
  it("words unassessed concepts as not a failure", () => {
    expect(suggestNext("loops")).toMatch(/not a failure/i);
  });
  it("recommends reviewing a weak prerequisite before a downstream concept", () => {
    expect(suggestNext("conditions")).toMatch(/Booleans/);
  });
});
