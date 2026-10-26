import type { AssessmentAttempt, LearnerData, LearningActivity } from "./types";
import { DEMO_CONCEPTS, DEMO_LEARNER_STATES } from "./demo-data";

/**
 * DEMONSTRATION DATA ONLY. Not real learner results.
 * Attempts and completed activities are an illustrative log kept consistent with
 * DEMO_LEARNER_STATES. They carry an ordinal `sequence`, NOT calendar dates, because
 * no real timestamps exist. Recommended activities are never stored here; they are
 * derived from evidence in history.ts.
 */
const done = (a: Omit<LearningActivity, "status">): LearningActivity => ({ ...a, status: "completed" });

export const DEMO_ACTIVITIES: LearningActivity[] = [
  done({ id: "s2", subjectId: "programming", type: "assessment", sequence: 1, title: "Variables check (3 questions)", conceptIds: ["variables"], summary: "Three questions on assigning and reading variables." }),
  done({ id: "a-bool-1", subjectId: "programming", type: "assessment", sequence: 2, title: "Booleans check (4 questions)", conceptIds: ["booleans"], summary: "Four questions on comparisons that produce True or False." }),
  done({ id: "a-bool-study", subjectId: "programming", type: "study-session", sequence: 3, title: "Booleans: comparisons walkthrough", conceptIds: ["booleans"], summary: "Studied how comparison operators produce True or False.", intervention: { kind: "step-by-step", note: "The tutor walked through evaluating a comparison one operator at a time." } }),
  done({ id: "a-bool-2", subjectId: "programming", type: "follow-up-assessment", sequence: 4, title: "Booleans re-check (4 questions)", conceptIds: ["booleans"], summary: "The same kind of comparison questions, after the walkthrough.", followsActivityId: "a-bool-study" }),
  done({ id: "a-lists-1", subjectId: "programming", type: "assessment", sequence: 5, title: "Lists check (2 questions)", conceptIds: ["lists"], summary: "One indexing and one slicing question." }),
  done({ id: "a-cond-1", subjectId: "programming", type: "assessment", sequence: 6, title: "Conditions check (3 questions)", conceptIds: ["conditions"], summary: "Three if/else questions, one with a compound condition." }),
  done({ id: "s1", subjectId: "programming", type: "study-session", sequence: 7, title: "Control flow: conditions walkthrough", conceptIds: ["conditions"], summary: "Read the Control Flow chapter and asked the tutor about conditions.", intervention: { kind: "example", note: "The tutor gave a worked if/else example with a compound condition." } }),
  done({ id: "a-found-1", subjectId: "mathematics", type: "assessment", sequence: 8, title: "Foundations check", conceptIds: ["arithmetic", "expressions"], summary: "Order of operations and simplifying expressions." }),
  done({ id: "a-eq-1", subjectId: "mathematics", type: "assessment", sequence: 9, title: "Linear equations check (3 questions)", conceptIds: ["equations"], summary: "Three one-step equations." }),
  done({ id: "a-arith-ret", subjectId: "mathematics", type: "retention-check", sequence: 10, title: "Arithmetic retention check (2 questions)", conceptIds: ["arithmetic"], summary: "Two order-of-operations questions, revisited after other work.", followsActivityId: "a-found-1" }),
  done({ id: "a-eq-practice", subjectId: "mathematics", type: "practice", sequence: 11, title: "Practised one-step equations", conceptIds: ["equations"], summary: "Worked through equations with the tutor. No scored result was recorded.", intervention: { kind: "analogy", note: "The tutor used a balance-scale analogy for doing the same thing to both sides." } }),
];

const at = (id: string, conceptId: string, activityId: string, kind: AssessmentAttempt["kind"], sequence: number, correct: number, total: number): AssessmentAttempt =>
  ({ id, conceptId, activityId, kind, sequence, correct, total });

export const DEMO_ATTEMPTS: AssessmentAttempt[] = [
  at("t1", "variables", "s2", "assessment", 1, 3, 3),
  at("t2", "booleans", "a-bool-1", "assessment", 2, 1, 4),
  at("t3", "booleans", "a-bool-2", "follow-up", 4, 2, 4),
  at("t4", "lists", "a-lists-1", "assessment", 5, 1, 2),
  at("t5", "conditions", "a-cond-1", "assessment", 6, 1, 3),
  at("t6", "arithmetic", "a-found-1", "assessment", 8, 5, 5),
  at("t7", "expressions", "a-found-1", "assessment", 8, 4, 4),
  at("t8", "equations", "a-eq-1", "assessment", 9, 1, 3),
  at("t9", "arithmetic", "a-arith-ret", "retention-check", 10, 2, 2),
];

export const DEMO_LEARNER_DATA: LearnerData = {
  concepts: DEMO_CONCEPTS,
  states: DEMO_LEARNER_STATES,
  attempts: DEMO_ATTEMPTS,
  activities: DEMO_ACTIVITIES,
};

/** What a learner with no assessments has: nothing. Used when demonstration data is removed. */
export const EMPTY_LEARNER_DATA: LearnerData = { concepts: [], states: [], attempts: [], activities: [] };
