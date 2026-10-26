import { describe, expect, it } from "vitest";
import { DEMO_LEARNER_DATA, EMPTY_LEARNER_DATA } from "@/lib/recallmap/demo-history";
import { NO_FILTERS, allActivities, attemptsForActivity, filterHistory, priorAttempt } from "@/lib/recallmap/history";

const D = DEMO_LEARNER_DATA;
const all = allActivities(D);

describe("history ordering and status", () => {
  it("lists completed activity newest first, with recommendations kept apart after it", () => {
    const completed = all.filter((a) => a.status === "completed");
    const seq = completed.map((a) => a.sequence!);
    expect(seq).toEqual([...seq].sort((a, b) => b - a));
    expect(all.indexOf(completed[completed.length - 1])).toBeLessThan(all.findIndex((a) => a.status === "recommended"));
  });
  it("never stores recommendations as history", () => {
    expect(D.activities.every((a) => a.status === "completed")).toBe(true);
    expect(all.some((a) => a.status === "recommended")).toBe(true);
  });
  it("covers every supported activity type in the demo log", () => {
    expect(new Set(D.activities.map((a) => a.type))).toEqual(new Set(["study-session", "assessment", "follow-up-assessment", "retention-check", "practice"]));
  });
  it("is empty with no data", () => expect(allActivities(EMPTY_LEARNER_DATA)).toEqual([]));
});

describe("filtering", () => {
  it("returns everything with no filters", () => expect(filterHistory(all, NO_FILTERS)).toHaveLength(all.length));
  it("filters by subject", () => {
    const r = filterHistory(all, { ...NO_FILTERS, subjectId: "mathematics" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((a) => a.subjectId === "mathematics")).toBe(true);
  });
  it("filters by type", () => {
    const r = filterHistory(all, { ...NO_FILTERS, type: "study-session" });
    expect(r.map((a) => a.id)).toEqual(["s1", "a-bool-study"]);
  });
  it("filters by status", () => {
    expect(filterHistory(all, { ...NO_FILTERS, status: "recommended" }).every((a) => a.status === "recommended")).toBe(true);
    expect(filterHistory(all, { ...NO_FILTERS, status: "completed" }).every((a) => a.status === "completed")).toBe(true);
  });
  it("combines filters and can return nothing", () => {
    expect(filterHistory(all, { subjectId: "mathematics", type: "study-session", status: "completed" })).toEqual([]);
  });
});

describe("activity detail", () => {
  it("links scored attempts to their activity and finds the previous attempt", () => {
    const recheck = attemptsForActivity(D, "a-bool-2");
    expect(recheck).toHaveLength(1);
    const prior = priorAttempt(D, recheck[0]);
    expect([prior?.correct, prior?.total]).toEqual([1, 4]);
  });
  it("first attempts have no previous attempt; unscored practice has no attempts", () => {
    expect(priorAttempt(D, attemptsForActivity(D, "a-bool-1")[0])).toBeNull();
    expect(attemptsForActivity(D, "a-eq-practice")).toEqual([]);
  });
  it("records which explanation was tried for study sessions", () => {
    expect(D.activities.find((a) => a.id === "a-bool-study")?.intervention?.kind).toBe("step-by-step");
  });
});
