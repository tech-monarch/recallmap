import type { Concept, LearnerConceptState, Material, Subject } from "./types";

/**
 * DEMONSTRATION DATA ONLY. Not real learner results.
 * The concept graph (DEMO_CONCEPTS) is learner-independent; learner evidence
 * (DEMO_LEARNER_STATES) is stored separately and keyed by concept id.
 */
export const DEMO_LABEL = "Demonstration data, not real results";

export const DEMO_SUBJECTS: Subject[] = [
  { id: "programming", name: "Programming", description: "Core ideas of writing programs in Python." },
  { id: "mathematics", name: "Mathematics", description: "Foundations of algebra and functions." },
];

export const DEMO_MATERIALS: Material[] = [
  { id: "m1", subjectId: "programming", title: "Python Basics, Chapter 3: Control Flow", kind: "pdf", addedAt: "Demo" },
  { id: "m2", subjectId: "programming", title: "Notes: loops and conditions", kind: "text", addedAt: "Demo" },
  { id: "m3", subjectId: "mathematics", title: "Intro to Functions", kind: "pdf", addedAt: "Demo" },
];

const P = "programming";
const M = "mathematics";
export const DEMO_CONCEPTS: Concept[] = [
  { id: "variables", subjectId: P, name: "Variables", topic: "Foundations", explanation: "Named places that hold values a program can read and change.", prerequisites: [] },
  { id: "booleans", subjectId: P, name: "Booleans", topic: "Foundations", explanation: "True/False values and the comparisons that produce them.", prerequisites: ["variables"] },
  { id: "conditions", subjectId: P, name: "Conditions", topic: "Control flow", explanation: "if / else statements choose which code runs based on a boolean.", prerequisites: ["booleans"] },
  { id: "loops", subjectId: P, name: "Loops", topic: "Control flow", explanation: "Repeat code while a condition holds or for each item in a sequence.", prerequisites: ["conditions"] },
  { id: "lists", subjectId: P, name: "Lists", topic: "Data", explanation: "Ordered collections of values you can index, slice and loop over.", prerequisites: ["variables"] },
  { id: "functions", subjectId: P, name: "Functions", topic: "Abstraction", explanation: "Reusable, named blocks of code that take inputs and return outputs.", prerequisites: ["variables", "conditions"] },
  { id: "recursion", subjectId: P, name: "Recursion", topic: "Abstraction", explanation: "A function that solves a problem by calling itself on a smaller version of it.", prerequisites: ["functions", "conditions"] },

  { id: "arithmetic", subjectId: M, name: "Arithmetic", topic: "Foundations", explanation: "Adding, subtracting, multiplying and dividing numbers, including order of operations.", prerequisites: [] },
  { id: "expressions", subjectId: M, name: "Expressions", topic: "Foundations", explanation: "Combinations of numbers, letters and operations, such as 3x + 2.", prerequisites: ["arithmetic"] },
  { id: "equations", subjectId: M, name: "Linear equations", topic: "Equations", explanation: "Finding the value that makes both sides equal, by doing the same thing to both sides.", prerequisites: ["expressions"] },
  { id: "quadratics", subjectId: M, name: "Quadratics", topic: "Equations", explanation: "Equations with a squared term, solved by factoring or the quadratic formula.", prerequisites: ["equations"] },
  { id: "function-notation", subjectId: M, name: "Function notation", topic: "Functions", explanation: "Writing f(x) to mean the output for input x.", prerequisites: ["expressions"] },
  { id: "graphing", subjectId: M, name: "Graphing functions", topic: "Functions", explanation: "Plotting inputs and outputs to see a function's shape.", prerequisites: ["function-notation"] },
];

export const DEMO_LEARNER_STATES: LearnerConceptState[] = [
  { conceptId: "variables", state: "demonstrated", evidence: [{ id: "e1", conceptId: "variables", kind: "observed-correct", summary: "Answered 3 of 3 variable-assignment questions correctly.", date: "Demo" }] },
  { conceptId: "booleans", state: "partial", evidence: [{ id: "e2", conceptId: "booleans", kind: "observed-correct", summary: "Correct on 2 of 4 comparison questions.", date: "Demo" }] },
  { conceptId: "conditions", state: "suspected-gap", evidence: [
    { id: "e3", conceptId: "conditions", kind: "observed-incorrect", summary: "Chose the wrong branch for an if/else with a compound condition.", date: "Demo" },
    { id: "e4", conceptId: "conditions", kind: "inferred-misconception", summary: "May be treating ‘and’ like ‘or’.", confidence: "low", date: "Demo" },
  ] },
  { conceptId: "loops", state: "not-assessed", evidence: [] },
  { conceptId: "lists", state: "partial", evidence: [{ id: "e5", conceptId: "lists", kind: "observed-correct", summary: "Indexing question correct; a slicing question was missed.", date: "Demo" }] },
  { conceptId: "functions", state: "not-assessed", evidence: [] },
  { conceptId: "recursion", state: "not-assessed", evidence: [] },

  { conceptId: "arithmetic", state: "demonstrated", evidence: [{ id: "e6", conceptId: "arithmetic", kind: "observed-correct", summary: "Answered 5 of 5 order-of-operations questions correctly.", date: "Demo" }] },
  { conceptId: "expressions", state: "demonstrated", evidence: [{ id: "e7", conceptId: "expressions", kind: "observed-correct", summary: "Simplified 4 of 4 expressions correctly.", date: "Demo" }] },
  { conceptId: "equations", state: "suspected-gap", evidence: [
    { id: "e8", conceptId: "equations", kind: "observed-incorrect", summary: "Got 2 of 3 one-step equations wrong.", date: "Demo" },
    { id: "e9", conceptId: "equations", kind: "inferred-misconception", summary: "May be changing only one side of the equation. Inferred from a pattern across two answers.", confidence: "medium", date: "Demo" },
  ] },
  { conceptId: "quadratics", state: "not-assessed", evidence: [] },
  { conceptId: "function-notation", state: "not-assessed", evidence: [] },
  { conceptId: "graphing", state: "not-assessed", evidence: [] },
];

export type DemoSession = { id: string; subjectId: string; title: string; when: string; kind: "study" | "assessment" };
export const DEMO_SESSIONS: DemoSession[] = [
  { id: "s1", subjectId: "programming", title: "Control flow: conditions walkthrough", when: "Demo · most recent", kind: "study" },
  { id: "s2", subjectId: "programming", title: "Variables check (3 questions)", when: "Demo · earlier", kind: "assessment" },
];

/** Layout positions (0-100) per concept, shared by the map and the dashboard preview. View concern only. */
export const DEMO_MAP_LAYOUT: Record<string, { x: number; y: number }> = {
  variables: { x: 10, y: 50 }, booleans: { x: 30, y: 22 }, conditions: { x: 52, y: 22 }, loops: { x: 76, y: 22 },
  lists: { x: 30, y: 80 }, functions: { x: 54, y: 62 }, recursion: { x: 80, y: 74 },
  arithmetic: { x: 10, y: 50 }, expressions: { x: 32, y: 50 }, equations: { x: 56, y: 26 }, quadratics: { x: 80, y: 26 },
  "function-notation": { x: 56, y: 74 }, graphing: { x: 80, y: 74 },
};
