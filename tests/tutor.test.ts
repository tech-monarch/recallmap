import { describe, expect, it } from "vitest";
import { askTutor, gradeAnswer, practiceFor } from "@/lib/recallmap/tutor";
import { DEMO_CONCEPTS } from "@/lib/recallmap/demo-data";
import { PRACTICE } from "@/lib/recallmap/demo-tutor";

const base = { subjectId: "programming", materialId: "m1", conceptId: "conditions" };

describe("demo tutor", () => {
  it("always labels replies as demo, never gemini", async () => {
    for (const mode of ["answer", "simpler", "steps", "example", "analogy"] as const) {
      const r = await askTutor({ ...base, mode }, DEMO_CONCEPTS);
      expect(r.source).toBe("demo");
      expect(r.text.length).toBeGreaterThan(10);
    }
  });
  it("gives different text for different modes", async () => {
    const a = await askTutor({ ...base, mode: "simpler" }, DEMO_CONCEPTS);
    const b = await askTutor({ ...base, mode: "steps" }, DEMO_CONCEPTS);
    expect(a.text).not.toBe(b.text);
  });
  it("handles a subject with no concepts", async () => {
    const r = await askTutor({ subjectId: "mathematics", materialId: "m3", conceptId: null, mode: "answer" }, []);
    expect(r.source).toBe("demo");
    expect(r.conceptId).toBeNull();
  });
});

describe("local grading", () => {
  it("grades every question correctly and only explains cause as a possibility", () => {
    for (const q of PRACTICE) {
      expect(gradeAnswer(q, q.correctId).correct).toBe(true);
      const wrong = q.options.find((o) => o.id !== q.correctId)!;
      const g = gradeAnswer(q, wrong.id);
      expect(g.correct).toBe(false);
      if (g.possibleCause) expect(g.possibleCause.toLowerCase()).toMatch(/possible/);
    }
  });
  it("finds questions per concept", () => {
    expect(practiceFor("conditions").length).toBeGreaterThan(0);
    expect(practiceFor(null)).toEqual([]);
  });
});
