import type { AssessmentAttempt, Concept, LearnerData, LearningActivity, UnderstandingState } from "./types";

/**
 * Progress = demonstrated understanding from scored attempts. It is NOT time spent, sessions opened,
 * or any engagement count. Everything here is a pure function of a `LearnerData` argument so it can be
 * tested with empty or sparse evidence, and later fed from the API instead of demo data.
 * Calendar time is never invented: attempts carry an ordinal `sequence` and trends compare order only.
 */
export const IMPROVEMENT_THRESHOLD = 0.1; // change in accuracy (10 percentage points) before we call it a change
export const WEAK_BELOW = 0.5; // first attempt below this accuracy counts as "previously weak"
export const MIN_QUESTIONS_FOR_CONFIDENCE = 3; // fewer total scored questions = limited evidence

export const accuracy = (a: Pick<AssessmentAttempt, "correct" | "total">): number | null => (a.total > 0 ? a.correct / a.total : null);

const stateOf = (d: LearnerData, id: string): UnderstandingState => d.states.find((s) => s.conceptId === id)?.state ?? "not-assessed";

/** Scored attempts for a concept, earliest first. Attempts with no questions are ignored. */
export const attemptsFor = (d: LearnerData, conceptId: string): AssessmentAttempt[] =>
  d.attempts.filter((a) => a.conceptId === conceptId && a.total > 0).sort((x, y) => x.sequence - y.sequence);

export type ConceptProgress = {
  concept: Concept;
  state: UnderstandingState;
  attempts: AssessmentAttempt[];
  questions: number;
  correct: number;
  /** "measured": derived from scored attempts. "estimated": a state exists with no scored attempt behind it. "none": no data. */
  basis: "measured" | "estimated" | "none";
};

export function conceptProgress(d: LearnerData, concept: Concept): ConceptProgress {
  const state = stateOf(d, concept.id);
  const attempts = attemptsFor(d, concept.id);
  const questions = attempts.reduce((n, a) => n + a.total, 0);
  const correct = attempts.reduce((n, a) => n + a.correct, 0);
  const basis = attempts.length > 0 ? "measured" : state === "not-assessed" ? "none" : "estimated";
  return { concept, state, attempts, questions, correct, basis };
}

export type TopicProgress = { topic: string; concepts: ConceptProgress[] };
export type SubjectProgress = {
  subjectId: string;
  total: number;
  counts: Record<UnderstandingState, number>;
  assessed: number;
  topics: TopicProgress[];
};

export function subjectProgress(d: LearnerData, subjectId: string): SubjectProgress {
  const concepts = d.concepts.filter((c) => c.subjectId === subjectId);
  const counts: Record<UnderstandingState, number> = { demonstrated: 0, partial: 0, "suspected-gap": 0, "not-assessed": 0 };
  const topics = new Map<string, ConceptProgress[]>();
  for (const c of concepts) {
    const cp = conceptProgress(d, c);
    counts[cp.state] += 1;
    topics.set(c.topic, [...(topics.get(c.topic) ?? []), cp]);
  }
  return {
    subjectId,
    total: concepts.length,
    counts,
    assessed: concepts.length - counts["not-assessed"],
    topics: [...topics].map(([topic, cs]) => ({ topic, concepts: cs })),
  };
}

export type Trend =
  | { kind: "no-data" }
  | { kind: "single"; attempt: AssessmentAttempt }
  | { kind: "improved" | "declined" | "unchanged"; first: AssessmentAttempt; latest: AssessmentAttempt; attemptCount: number };

/** Change between the first and latest scored attempt. Needs at least two; one attempt is never a trend. */
export function trendFor(d: LearnerData, conceptId: string): Trend {
  const at = attemptsFor(d, conceptId);
  if (at.length === 0) return { kind: "no-data" };
  if (at.length === 1) return { kind: "single", attempt: at[0] };
  const first = at[0];
  const latest = at[at.length - 1];
  const delta = (accuracy(latest) ?? 0) - (accuracy(first) ?? 0);
  const kind = delta >= IMPROVEMENT_THRESHOLD ? "improved" : delta <= -IMPROVEMENT_THRESHOLD ? "declined" : "unchanged";
  return { kind, first, latest, attemptCount: at.length };
}

export function trendsOverTime(d: LearnerData) {
  const rows = d.concepts.map((concept) => ({ concept, trend: trendFor(d, concept.id) }));
  return {
    changes: rows.filter((r): r is { concept: Concept; trend: Extract<Trend, { first: AssessmentAttempt }> } => "first" in r.trend),
    singleAttempt: rows.filter((r) => r.trend.kind === "single").length,
  };
}

/** Concepts whose FIRST attempt was weak and whose latest attempt is clearly better. Says nothing about mastery. */
export function improvedConcepts(d: LearnerData) {
  return trendsOverTime(d).changes.filter(({ trend }) => trend.kind === "improved" && (accuracy(trend.first) ?? 1) < WEAK_BELOW);
}

export type UncertaintyReason = "not-assessed" | "limited-evidence" | "unconfirmed-inference";
export function uncertainConcepts(d: LearnerData): { concept: Concept; state: UnderstandingState; reasons: UncertaintyReason[] }[] {
  const out: { concept: Concept; state: UnderstandingState; reasons: UncertaintyReason[] }[] = [];
  for (const concept of d.concepts) {
    const cp = conceptProgress(d, concept);
    const reasons: UncertaintyReason[] = [];
    if (cp.state === "not-assessed") reasons.push("not-assessed");
    else if (cp.questions < MIN_QUESTIONS_FOR_CONFIDENCE) reasons.push("limited-evidence");
    if (d.states.find((s) => s.conceptId === concept.id)?.evidence.some((e) => e.kind === "inferred-misconception")) reasons.push("unconfirmed-inference");
    if (reasons.length) out.push({ concept, state: cp.state, reasons });
  }
  return out;
}

export const completedRetentionChecks = (d: LearnerData) =>
  d.attempts
    .filter((a) => a.kind === "retention-check" && a.total > 0)
    .sort((x, y) => y.sequence - x.sequence)
    .map((attempt) => ({ attempt, concept: d.concepts.find((c) => c.id === attempt.conceptId) ?? null }))
    .filter((r): r is { attempt: AssessmentAttempt; concept: Concept } => r.concept !== null);

/**
 * Recommended (NOT yet done) activities, derived from evidence. No dates: without real timestamps
 * RecallMap cannot say WHEN something is due, only that it is suggested and why.
 */
export function recommendedActivities(d: LearnerData): LearningActivity[] {
  const retained = new Set(d.attempts.filter((a) => a.kind === "retention-check").map((a) => a.conceptId));
  const rank = { "suspected-gap": 0, partial: 1, demonstrated: 2, "not-assessed": 3 } as const;
  const out: (LearningActivity & { _r: number })[] = [];
  for (const c of d.concepts) {
    const state = stateOf(d, c.id);
    const prereqs = c.prerequisites.map((id) => d.concepts.find((x) => x.id === id)).filter((x): x is Concept => !!x);
    const base = { status: "recommended" as const, subjectId: c.subjectId, conceptIds: [c.id], _r: rank[state] };
    if (state === "suspected-gap" || state === "partial") {
      const weak = prereqs.find((p) => ["suspected-gap", "partial"].includes(stateOf(d, p.id)));
      out.push({ ...base, id: `rec-reassess-${c.id}`, type: "follow-up-assessment", title: `Reassess: ${c.name}`,
        summary: weak ? `Review ${weak.name} first, then take a short check on ${c.name}.` : `Study ${c.name} with a worked example, then take a short check.`,
        reason: state === "suspected-gap" ? "Evidence suggests a gap. Reassessment confirms or clears it." : "Some understanding shown; more evidence is needed." });
    } else if (state === "demonstrated" && !retained.has(c.id)) {
      out.push({ ...base, id: `rec-retention-${c.id}`, type: "retention-check", title: `Retention check: ${c.name}`,
        summary: `A short check to see whether ${c.name} is still understood.`, reason: "Understanding was shown once and has not been re-checked yet." });
    } else if (state === "not-assessed" && prereqs.every((p) => stateOf(d, p.id) === "demonstrated")) {
      out.push({ ...base, id: `rec-first-${c.id}`, type: "assessment", title: `First check: ${c.name}`,
        summary: `A short check on ${c.name}. Not yet assessed is not a failure.`, reason: prereqs.length ? "Its prerequisites are demonstrated, so this is a reasonable next concept to assess." : "It has no prerequisites and has not been assessed." });
    }
  }
  return out.sort((a, b) => a._r - b._r).map(({ _r, ...rest }) => (void _r, rest));
}

export const hasAnyEvidence = (d: LearnerData) => d.attempts.some((a) => a.total > 0) || d.states.some((s) => s.state !== "not-assessed");
