import { DEMO_CONCEPTS, DEMO_LEARNER_STATES } from "./demo-data";
import type { Concept, Evidence, UnderstandingState } from "./types";

/** Read access to the concept graph and learner state. Swap for API calls later (GET /api/subjects/:id/map). */
export const conceptsFor = (subjectId: string): Concept[] => DEMO_CONCEPTS.filter((c) => c.subjectId === subjectId);
export const conceptById = (id: string) => DEMO_CONCEPTS.find((c) => c.id === id) ?? null;
export const stateOf = (id: string): UnderstandingState => DEMO_LEARNER_STATES.find((s) => s.conceptId === id)?.state ?? "not-assessed";
export const evidenceOf = (id: string): Evidence[] => DEMO_LEARNER_STATES.find((s) => s.conceptId === id)?.evidence ?? [];
export const prerequisitesOf = (id: string): Concept[] => (conceptById(id)?.prerequisites ?? []).map(conceptById).filter((c): c is Concept => !!c);
export const dependentsOf = (id: string): Concept[] => DEMO_CONCEPTS.filter((c) => c.prerequisites.includes(id));

/** All transitive prerequisites of a concept. */
export function ancestorsOf(id: string): Set<string> {
  const out = new Set<string>();
  const walk = (cid: string) => conceptById(cid)?.prerequisites.forEach((p) => { if (!out.has(p)) { out.add(p); walk(p); } });
  walk(id);
  return out;
}

export function suggestNext(id: string): string {
  const c = conceptById(id);
  if (!c) return "";
  const state = stateOf(id);
  const weakPrereq = prerequisitesOf(id).find((p) => ["suspected-gap", "partial"].includes(stateOf(p.id)));
  switch (state) {
    case "demonstrated": return "Schedule a retention check later to confirm it sticks.";
    case "partial": return weakPrereq && stateOf(weakPrereq.id) === "suspected-gap" ? `Review ${weakPrereq.name} first, then practice ${c.name} again.` : `Do a few more practice questions on ${c.name}.`;
    case "suspected-gap": return weakPrereq ? `Review ${weakPrereq.name} first, then reassess ${c.name}.` : `Study ${c.name} with a worked example, then reassess with a short check.`;
    default: return `Take a short check on ${c.name} to see where you stand. Not yet assessed is not a failure.`;
  }
}

export type GapItem = { concept: Concept; evidence: Evidence[]; prerequisites: Concept[]; blocks: Concept[]; recommendation: string };
export function suspectedGaps(): GapItem[] {
  return DEMO_CONCEPTS.filter((c) => stateOf(c.id) === "suspected-gap").map((concept) => ({
    concept, evidence: evidenceOf(concept.id), prerequisites: prerequisitesOf(concept.id), blocks: dependentsOf(concept.id), recommendation: suggestNext(concept.id),
  }));
}
