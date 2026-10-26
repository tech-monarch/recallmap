/**
 * RecallMap domain types.
 * Keep the CONCEPT GRAPH (subject-level, learner-independent) separate from
 * LEARNER EVIDENCE (per-learner assessment state). See HANDOFF.md.
 */
export type Subject = { id: string; name: string; description: string };

export type Material = {
  id: string;
  subjectId: string;
  title: string;
  kind: "pdf" | "text";
  addedAt: string;
};

// --- Concept graph (learner-independent) ---
export type Concept = {
  id: string;
  subjectId: string;
  name: string;
  topic: string;
  explanation: string;
  prerequisites: string[]; // concept ids
};

// --- Learner model (learner-specific) ---
export type UnderstandingState =
  | "demonstrated"
  | "partial"
  | "suspected-gap"
  | "not-assessed";

export type Evidence = {
  id: string;
  conceptId: string;
  kind: "observed-incorrect" | "observed-correct" | "inferred-misconception";
  summary: string;
  date: string;
  /** Only for inferred evidence: how strongly the data supports the inference. */
  confidence?: "low" | "medium" | "high";
};

export type LearnerConceptState = {
  conceptId: string;
  state: UnderstandingState;
  evidence: Evidence[];
};

// --- Assessment attempts and learning activity (Milestone 5) ---
/**
 * One scored attempt on a single concept. `sequence` is an ORDINAL position (1 = earliest);
 * demo data has no calendar dates, so trends compare order, never elapsed time.
 */
export type AssessmentAttempt = {
  id: string;
  conceptId: string;
  activityId: string;
  kind: "assessment" | "follow-up" | "retention-check";
  sequence: number;
  correct: number;
  total: number;
};

export type ActivityType = "study-session" | "assessment" | "follow-up-assessment" | "retention-check" | "practice";
/** "recommended" activities have NOT happened; they are suggestions derived from learner evidence. */
export type ActivityStatus = "completed" | "recommended";

export type ExplanationAttempt = {
  kind: "step-by-step" | "example" | "analogy" | "simpler" | "prerequisite-review";
  note: string;
};

export type LearningActivity = {
  id: string;
  subjectId: string;
  type: ActivityType;
  status: ActivityStatus;
  title: string;
  conceptIds: string[];
  /** Ordinal position of a completed activity (higher = more recent). Absent for recommendations. */
  sequence?: number;
  summary: string;
  /** Explanation or intervention tried during the activity, if any. */
  intervention?: ExplanationAttempt;
  /** For follow-up assessments: the activity whose effect is being re-checked. */
  followsActivityId?: string;
  /** For recommended activities: why RecallMap suggests it. */
  reason?: string;
};

/** Everything the progress and history pages read. Swap for the API later (GET /api/progress, GET /api/history). */
export type LearnerData = {
  concepts: Concept[];
  states: LearnerConceptState[];
  attempts: AssessmentAttempt[];
  activities: LearningActivity[];
};

// --- Learning preferences (shape mirrors PUT /api/me/preferences) ---
export type ExplanationStyle = "steps" | "examples" | "analogies" | "visual";
export type ExplanationDepth = "brief" | "standard" | "detailed";
export type LearningPace = "slow" | "normal" | "fast";
export type PreferredDifficulty = "gentle" | "standard" | "challenging";
export type LearnerPreferences = {
  goals: string;
  explanationStyle: ExplanationStyle[];
  explanationDepth: ExplanationDepth;
  pace: LearningPace;
  difficulty: PreferredDifficulty;
};
